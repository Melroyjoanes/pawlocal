import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailTemplate } from '@/lib/email'

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const now = new Date()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles, error } = await (supabase.from('profiles') as any)
    .select('id, trial_started_at')
    .not('trial_started_at', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let processed = 0

  for (const profile of (profiles ?? []) as Array<{ id: string; trial_started_at: string }>) {
    const trialStart = new Date(profile.trial_started_at)
    const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / 86400000)

    const isWarning = daysSinceStart >= 11 && daysSinceStart <= 13
    const isExpired = daysSinceStart >= 14

    if (!isWarning && !isExpired) continue

    // Check for active subscription — skip if one exists
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

    if (isWarning) {
      const daysLeft = 14 - daysSinceStart
      sendEmail({
        to: email,
        subject: 'Your PupStep trial ends soon',
        html: emailTemplate(
          'Your trial ends soon',
          `Your free trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Upgrade now to keep your walk reports.`,
          'Upgrade now',
          'https://pupstep.in/upgrade',
        ),
      }).catch(() => {})
    } else {
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
    }

    processed++
  }

  return NextResponse.json({ ok: true, processed })
}
