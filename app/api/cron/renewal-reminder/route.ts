import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailTemplate } from '@/lib/email'

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/cron/renewal-reminder
// Runs daily — emails users whose subscription expires in 3 days so they know to renew.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = adminClient()
  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 86400 * 1000).toISOString()
  const in4Days = new Date(now.getTime() + 4 * 86400 * 1000).toISOString()

  // Find subscriptions expiring in the next 3–4 day window (catches daily run drift)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs, error } = await (db.from('subscriptions') as any)
    .select('user_id, plan, expires_at')
    .eq('status', 'active')
    .gte('expires_at', now.toISOString())
    .lte('expires_at', in4Days)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let processed = 0

  for (const sub of (subs ?? []) as Array<{ user_id: string; plan: string; expires_at: string }>) {
    const { data: { user } } = await db.auth.admin.getUserById(sub.user_id)
    const email = user?.email
    if (!email) continue

    const expiryLabel = new Date(sub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
    const planLabel = sub.plan === 'annual' ? '₹1,999/year' : '₹249/month'

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

    processed++
  }

  return NextResponse.json({ ok: true, processed })
}
