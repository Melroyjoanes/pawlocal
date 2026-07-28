import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailTemplate } from '@/lib/email'

// Force fresh execution on every invocation — this is a cron target, never
// safe to serve a cached/stale response.
export const dynamic = 'force-dynamic'
export const revalidate = 0

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/cron/ops-digest
//
// Runs once a day (02:30 UTC / 08:00 IST, see
// .github/workflows/ops-digest-cron.yml) and emails the founder a short
// internal ops summary. This is the push side of the admin dashboard: until
// now the only way to notice anything was to open /admin and look, which is
// how a broken login went unnoticed for three weeks.
//
// RECIPIENT: the founder, and only the founder. This route resolves exactly
// one address (ADMIN_EMAIL, falling back to melroy@verfolia.com) and never
// reads a customer address into the `to` field. Customer emails appear in the
// body as data the founder is looking at, never as recipients. Do not extend
// this route to send to anyone else — the walker-noshow cron is disabled in
// this repo precisely because it emailed customers.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'melroy@verfolia.com'

type ExpiringSub = { user_id: string; plan: string; expires_at: string }
type AuthFailedRow = { metadata: { reason?: string } | null }

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?dry_run=true — same pattern as trial-expiry and renewal-reminder: runs
  // the exact same queries against real data, sends nothing, and returns the
  // computed digest as JSON so it can be verified without hitting an inbox.
  const dryRun = req.nextUrl.searchParams.get('dry_run') === 'true'

  const db = adminClient()
  const now = new Date()
  const since = new Date(now.getTime() - 24 * 3600 * 1000).toISOString()
  const in7Days = new Date(now.getTime() + 7 * 86400 * 1000).toISOString()

  const [signupsRes, walksRes, reportsRes, expiringRes, authFailedRes] = await Promise.all([
    // New signups — profiles row is created at account creation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('profiles') as any).select('id', { count: 'exact', head: true }).gte('created_at', since),
    // Walks completed — a walk_logs row is written when a walk is logged,
    // by a connected walker or by the parent themselves (logged_by).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_logs') as any).select('id', { count: 'exact', head: true }).gte('created_at', since),
    // Reports delivered — email_sent_at is stamped when the walk report
    // email actually goes out, so this counts delivery, not just creation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_reports') as any).select('id', { count: 'exact', head: true }).gte('email_sent_at', since),
    // Subscriptions expiring in the next 7 days.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('subscriptions') as any)
      .select('user_id, plan, expires_at')
      .eq('status', 'active')
      .gte('expires_at', now.toISOString())
      .lte('expires_at', in7Days)
      .order('expires_at', { ascending: true }),
    // auth_failed events — written by app/auth/callback/route.ts whenever a
    // sign-in round trip fails. Any non-zero count here means real people
    // could not log in, which is the single thing most worth surfacing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('analytics_events') as any)
      .select('metadata')
      .eq('event_type', 'auth_failed')
      .gte('created_at', since),
  ])

  const firstError =
    signupsRes.error || walksRes.error || reportsRes.error || expiringRes.error || authFailedRes.error
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  const newSignups = signupsRes.count ?? 0
  const walksCompleted = walksRes.count ?? 0
  const reportsDelivered = reportsRes.count ?? 0

  // Resolve the expiring subscribers to emails. These are shown to the
  // founder as a list to act on; nothing is ever sent to them from here.
  const expiringSubs = (expiringRes.data ?? []) as ExpiringSub[]
  const expiringEmails: string[] = []
  for (const sub of expiringSubs) {
    const { data: { user } } = await db.auth.admin.getUserById(sub.user_id)
    if (user?.email) expiringEmails.push(user.email)
  }

  const authFailedRows = (authFailedRes.data ?? []) as AuthFailedRow[]
  const authFailedCount = authFailedRows.length
  const authFailedReasons = Array.from(
    new Set(authFailedRows.map((r) => r.metadata?.reason ?? 'unknown')),
  ).sort()

  const digest = {
    windowStart: since,
    windowEnd: now.toISOString(),
    newSignups,
    walksCompleted,
    reportsDelivered,
    expiringSoon: {
      count: expiringEmails.length,
      emails: expiringEmails,
    },
    authFailed: {
      count: authFailedCount,
      reasons: authFailedReasons,
    },
  }

  const dateLabel = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  })

  const authLine =
    authFailedCount > 0
      ? `<strong style="color:#B91C1C;">Failed logins: ${authFailedCount}</strong> (${authFailedReasons.join(', ')}) — people could not sign in. Check this first.`
      : 'Failed logins: 0'

  const expiringLine =
    expiringEmails.length > 0
      ? `Expiring in 7 days: ${expiringEmails.length}\n${expiringEmails.join('\n')}`
      : 'Expiring in 7 days: 0'

  const bodyText = [
    `Last 24 hours, as of ${dateLabel} 08:00 IST.`,
    '',
    `New signups: ${newSignups}`,
    `Walks completed: ${walksCompleted}`,
    `Reports delivered: ${reportsDelivered}`,
    '',
    expiringLine,
    '',
    authLine,
  ].join('\n')

  const subject =
    authFailedCount > 0
      ? `PupStep ops digest — ${authFailedCount} failed login${authFailedCount !== 1 ? 's' : ''}`
      : `PupStep ops digest — ${newSignups} signups, ${walksCompleted} walks`

  if (!dryRun) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html: emailTemplate('Daily ops digest', bodyText, 'Open admin dashboard', 'https://pupstep.in/admin'),
    })
  }

  return NextResponse.json({ ok: true, dryRun, to: ADMIN_EMAIL, subject, digest })
}
