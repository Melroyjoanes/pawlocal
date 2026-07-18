import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailTemplate } from '@/lib/email'

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/cron/renewal-reminder
// Runs daily — emails users whose subscription expires in 3 days so they know to renew.
//
// Previously had the same bug class as the trial-expiry cron: a 4-day-wide
// expiry window checked once a day with no memory of who'd already been
// notified. A subscription sits inside that window for ~5 consecutive daily
// runs before it actually expires, so the same person got "Your plan
// renews on X" up to 5 days in a row instead of once. Fixed with
// renewal_reminder_sent_at (migration 060) — cleared back to null whenever
// the subscription actually renews (see app/api/payments/verify/route.ts),
// so each billing cycle still gets its own fresh reminder.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?dry_run=true — same pattern as trial-expiry: runs the real query, sends
  // nothing, writes nothing, returns exactly who/what would happen.
  const dryRun = req.nextUrl.searchParams.get('dry_run') === 'true'

  const db = adminClient()
  const now = new Date()
  const in4Days = new Date(now.getTime() + 4 * 86400 * 1000).toISOString()

  // Find subscriptions expiring in the next 0–4 day window (catches daily run drift)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs, error } = await (db.from('subscriptions') as any)
    .select('id, user_id, plan, expires_at, renewal_reminder_sent_at')
    .eq('status', 'active')
    .gte('expires_at', now.toISOString())
    .lte('expires_at', in4Days)
    .is('renewal_reminder_sent_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let processed = 0
  const preview: string[] = []

  for (const sub of (subs ?? []) as Array<{ id: string; user_id: string; plan: string; expires_at: string; renewal_reminder_sent_at: string | null }>) {
    const { data: { user } } = await db.auth.admin.getUserById(sub.user_id)
    const email = user?.email
    if (!email) continue

    const expiryLabel = new Date(sub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })
    const planLabel = '₹199/month'

    preview.push(email)
    if (!dryRun) {
      sendEmail({
        to: email,
        subject: `Your PupStep Pro renews on ${expiryLabel}`,
        html: emailTemplate(
          `Your plan renews on ${expiryLabel}`,
          `Your PupStep Pro subscription (${planLabel}) expires on ${expiryLabel}. Renew now to keep your walk reports, GPS tracking, and care diary without any interruption.`,
          'Renew now',
          'https://pupstep.in/upgrade',
        ),
      }).catch(() => {})
      await (db.from('subscriptions') as any).update({ renewal_reminder_sent_at: now.toISOString() }).eq('id', sub.id)
    }

    processed++
  }

  return NextResponse.json({ ok: true, dryRun, processed, preview })
}
