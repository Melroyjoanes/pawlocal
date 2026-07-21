import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailTemplate } from '@/lib/email'

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// IST has no DST — fixed UTC+5:30 offset.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

// Conservative "the usual walk window has clearly passed" hours (IST, 24h).
// Mirrors the same thresholds used for the walker-side reminder banner in
// app/walker/[token]/WalkerClient.tsx (WALK_BUCKET_PASSED_HOUR_IST) — kept as
// a separate copy here since this is a server-only cron route and that file
// is a 'use client' component we don't want to import from.
const WALK_BUCKET_PASSED_HOUR_IST: Record<string, number> = {
  morning: 12,   // walk window is "morning" — only flag once it's past noon
  afternoon: 17, // flag once it's past 5pm
  evening: 21,   // flag once it's past 9pm
}

// GET /api/cron/walker-noshow
// Runs once daily, late evening IST (suggested schedule: 20:00 IST — see
// vercel.json cron entry noted in the PR description). For every ACTIVE
// walker_connections row whose dog has a walk_time_bucket set, checks
// whether a walk_reports row was created today (IST) for that connection.
// Only checks buckets whose usual walk time has clearly passed relative to
// "now" — conservative on purpose, better to under-alert than spam a parent
// whose walker is just running late. If nothing was logged, emails the
// PARENT (never the walker) with a neutral, informative nudge — this could
// just be a delayed walk, not an actual no-show.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?dry_run=true — same safety pattern as the other crons: runs the real
  // query logic, sends nothing.
  const dryRun = req.nextUrl.searchParams.get('dry_run') === 'true'

  const db = adminClient()

  // "Now", expressed as IST wall-clock time (via a fixed UTC+5:30 shift so
  // the UTC-getters below read as IST hours/date, not the server's local tz).
  const nowUtcMs = Date.now()
  const istNow = new Date(nowUtcMs + IST_OFFSET_MS)
  const istHour = istNow.getUTCHours()

  // Start of "today" in IST, expressed back as a true UTC instant — used to
  // bound the walk_reports query to "created today, IST calendar day".
  const startOfTodayIstUtcMs =
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0) - IST_OFFSET_MS
  const startOfTodayIso = new Date(startOfTodayIstUtcMs).toISOString()
  const nowIso = new Date(nowUtcMs).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: connections, error } = await (db.from('walker_connections') as any)
    .select(`
      id,
      owner_id,
      walker_name,
      status,
      dogs!walker_connections_dog_id_fkey (
        name,
        walk_time_bucket
      )
    `)
    .eq('status', 'active')

  // walk_time_bucket is a nullable column added in migration 053 — until that
  // migration is run manually against prod, the column won't exist yet. Retry
  // without it (this cron just has nothing to check for no-shows that day)
  // rather than failing the whole run.
  if (error && /walk_time_bucket/i.test(error.message ?? '')) {
    ;({ data: connections, error } = await (db.from('walker_connections') as any)
      .select(`
        id,
        owner_id,
        walker_name,
        status,
        dogs!walker_connections_dog_id_fkey ( name )
      `)
      .eq('status', 'active'))
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let processed = 0
  let checked = 0
  const preview: string[] = []

  type ConnRow = {
    id: string
    owner_id: string | null
    walker_name: string | null
    status: string
    dogs: { name: string | null; walk_time_bucket: string | null } | null
  }

  for (const conn of (connections ?? []) as ConnRow[]) {
    const bucket = conn.dogs?.walk_time_bucket ?? null
    if (!bucket) continue

    const passHour = WALK_BUCKET_PASSED_HOUR_IST[bucket]
    if (passHour == null || istHour < passHour) continue // window hasn't clearly passed yet — skip for today

    if (!conn.owner_id) continue

    checked++

    // Checked by owner_id, not connection_id — a parent can log a self-walk
    // (app/walk/self) with no walker_connections row involved at all. That
    // report has connection_id NULL, so a connection_id-scoped check here
    // would miss it and send a "no walk from your walker" nudge on a day the
    // dog was walked by the parent themselves.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: reportsToday, error: reportsError } = await (db.from('walk_reports') as any)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', conn.owner_id)
      .gte('created_at', startOfTodayIso)
      .lte('created_at', nowIso)

    if (reportsError) {
      console.error('[walker-noshow] report lookup failed:', reportsError)
      continue
    }

    if ((reportsToday ?? 0) > 0) continue // walker already logged today — nothing to do

    const { data: { user } } = await db.auth.admin.getUserById(conn.owner_id)
    const email = user?.email
    if (!email) continue

    const dogName = conn.dogs?.name ?? 'your dog'
    const walkerName = conn.walker_name ?? 'your walker'

    preview.push(email)
    if (!dryRun) {
      sendEmail({
        to: email,
        subject: `No walk report from ${walkerName} today`,
        html: emailTemplate(
          'No walk report yet today',
          `We haven't seen a walk report from ${walkerName} for ${dogName} today. This could just mean the walk is running later than usual — but if you haven't heard from ${walkerName} either, it might be worth checking in.`,
        ),
      }).catch(() => {})
    }

    processed++
  }

  return NextResponse.json({ ok: true, dryRun, checked, processed, preview })
}
