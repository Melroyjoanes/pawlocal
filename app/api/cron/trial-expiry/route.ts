import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailTemplate } from '@/lib/email'
import { TRIAL_DAYS } from '@/lib/entitlement'

// Force fresh execution on every invocation — this is a cron target, never
// safe to serve a cached/stale response.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Runs HOURLY (see vercel.json) so the "ending soon" email can land in a
// tight 3-4h-before-expiry window instead of just "sometime during the
// right day." The three *_email_sent_at columns on profiles (migration 059)
// are what make hourly-safe: each email fires exactly once per profile,
// checked by column-is-null rather than by day-of-week math, which is what
// let the old daily version send the "ended" email every day forever.
function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const ENDING_SOON_WINDOW_HOURS = 4

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?dry_run=true runs the exact same query + eligibility logic against
  // real data, but sends no email and writes nothing to the database.
  // Built after a real user got an unexpected email during manual testing —
  // this is how this route should always be verified going forward, not by
  // hitting production and hoping.
  const dryRun = req.nextUrl.searchParams.get('dry_run') === 'true'

  const supabase = adminClient()
  const now = new Date()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles, error } = await (supabase.from('profiles') as any)
    .select('id, trial_started_at, trial_started_email_sent_at, trial_ending_email_sent_at, trial_ended_email_sent_at')
    .not('trial_started_at', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Profile = {
    id: string
    trial_started_at: string
    trial_started_email_sent_at: string | null
    trial_ending_email_sent_at: string | null
    trial_ended_email_sent_at: string | null
  }

  let sent = { started: 0, ending: 0, ended: 0 }
  const preview: Array<{ email: string; type: 'started' | 'ending' | 'ended' }> = []

  for (const profile of (profiles ?? []) as Profile[]) {
    // Nothing left to send for this profile — skip before the subscription
    // lookup, which is the expensive part of the loop.
    if (profile.trial_started_email_sent_at && profile.trial_ending_email_sent_at && profile.trial_ended_email_sent_at) {
      continue
    }

    const trialStart = new Date(profile.trial_started_at)
    const hoursSinceStart = (now.getTime() - trialStart.getTime()) / 3600000
    const hoursUntilEnd = TRIAL_DAYS * 24 - hoursSinceStart

    const needsStarted = !profile.trial_started_email_sent_at
    const needsEnding = !profile.trial_ending_email_sent_at && hoursUntilEnd > 0 && hoursUntilEnd <= ENDING_SOON_WINDOW_HOURS
    const needsEnded = !profile.trial_ended_email_sent_at && hoursUntilEnd <= 0

    if (!needsStarted && !needsEnding && !needsEnded) continue

    // Active subscription — this account converted, nothing left to nudge.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabase.from('subscriptions') as any)
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()
    if (sub) continue

    const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
    const email = user?.email
    if (!email) continue

    if (needsStarted) {
      preview.push({ email, type: 'started' })
      if (!dryRun) {
        sendEmail({
          to: email,
          subject: 'Your PupStep free trial has started',
          html: emailTemplate(
            'Your free trial has started',
            `You have ${TRIAL_DAYS} days of full access to walk reports and your dog's care diary. Upgrade any time to keep access after your trial ends.`,
            'See plans',
            'https://pupstep.in/upgrade',
          ),
        }).catch(() => {})
        await (supabase.from('profiles') as any).update({ trial_started_email_sent_at: now.toISOString() }).eq('id', profile.id)
      }
      sent.started++
    }

    if (needsEnding) {
      preview.push({ email, type: 'ending' })
      if (!dryRun) {
        sendEmail({
          to: email,
          subject: 'Your PupStep trial ends in a few hours',
          html: emailTemplate(
            'Your trial ends soon',
            'Your free trial expires in a few hours. Upgrade now to keep your walk reports and care diary.',
            'Upgrade now',
            'https://pupstep.in/upgrade',
          ),
        }).catch(() => {})
        await (supabase.from('profiles') as any).update({ trial_ending_email_sent_at: now.toISOString() }).eq('id', profile.id)
      }
      sent.ending++
    }

    if (needsEnded) {
      preview.push({ email, type: 'ended' })
      if (!dryRun) {
        sendEmail({
          to: email,
          subject: 'Your PupStep trial has ended',
          html: emailTemplate(
            'Your trial has ended',
            'Your free trial has ended. Upgrade to restore access to your walk reports and care diary.',
            'Upgrade now',
            'https://pupstep.in/upgrade',
          ),
        }).catch(() => {})
        await (supabase.from('profiles') as any).update({ trial_ended_email_sent_at: now.toISOString() }).eq('id', profile.id)
      }
      sent.ended++
    }
  }

  return NextResponse.json({ ok: true, dryRun, sent, preview })
}
