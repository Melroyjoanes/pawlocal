import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import HomeClient from './HomeClient'
import { computeStreak, todayMidnightIST, fourteenDaysAgoIST } from '@/lib/streak'
import { getEntitlement } from '@/lib/entitlement'

export const dynamic = 'force-dynamic'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function computeWeekData(logs: Array<{ started_at: string; distance_km?: number | null; poop_count?: number | null }>) {
  const istOffset = 5.5 * 60 * 60 * 1000
  const toISTDateStr = (iso: string) => new Date(new Date(iso).getTime() + istOffset).toISOString().slice(0, 10)
  const now = new Date(Date.now() + istOffset)
  const days: { label: string; date: string; walked: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const label = ['S','M','T','W','T','F','S'][d.getUTCDay()]
    days.push({ label, date: dateStr, walked: false })
  }
  const walkedDates = new Set(logs.map(l => toISTDateStr(l.started_at)))
  days.forEach(d => { d.walked = walkedDates.has(d.date) })
  const totalKm = logs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
  const totalPoops = logs.reduce((s, l) => s + (l.poop_count ?? 0), 0)
  const totalWalks = walkedDates.size
  return { days, totalKm: Math.round(totalKm * 10) / 10, totalPoops, totalWalks }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ dog?: string }>
}) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth_required=1&next=/home')

  const { dog: requestedDogId } = await searchParams

  // Wrap everything in try-catch — if any query or env var is missing,
  // still render the page with defaults rather than showing a blank crash screen
  try {
    return await renderHome(user, requestedDogId)
  } catch (err) {
    console.error('[home] render error:', err instanceof Error ? err.stack : err)
    return (
      <HomeClient
        displayName={user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'there'}
        firstDog={null}
        otherDogs={[]}
        activeWalk={null}
        completedWalk={null}
        walkerConnections={[]}
        lastWalk={null}
        isPro={false}
        walkStreak={0}
        weekData={{ days: [], totalKm: 0, totalPoops: 0, totalWalks: 0 }}
        lastWalkLog={null}
        todayWalked={false}
        todayLogs={[]}
        trialStatus="no_trial"
        trialDaysRemaining={null}
        trialStartedAt={null}
        missedWalksCount={0}
        totalReports={0}
      />
    )
  }
}

async function renderHome(
  user: { id: string; user_metadata?: Record<string, string> | null; email?: string | null },
  requestedDogId?: string
) {
  const db = admin()
  const todayMidnight = todayMidnightIST()

  // Fetch all data with individual error handling so one failing query
  // never crashes the entire page
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safe = async (q: any) => { try { return await q } catch { return { data: null, count: null } } }

  const [
    { data: profileData },
    { data: dogsRaw },
    { data: walkerConnectionsRaw },
    entitlement,
    { count: reportCount },
    { data: mostRecentLogData },
  ] = await Promise.all([
    safe((db.from('profiles') as any)
      .select('id, full_name, avatar_url, trial_started_at')
      .eq('id', user.id)
      .maybeSingle()),

    // All dogs for this owner — a parent may have 2+ dogs, home page shows one
    // fully expanded at a time plus a chip row for the others
    safe((db.from('dogs') as any)
      .select('id, name, breed, photo_url, health_notes, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })),

    safe((db.from('walker_connections') as any)
      .select('id, walker_name, walker_phone, walker_role, status, dog_id, token, dogs(name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })),

    getEntitlement(db, user.id),

    safe((db.from('walk_logs') as any)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)),

    // Most recently-active dog across ALL of this owner's dogs (all-time, not
    // just the 14-day window) — used as the default expanded dog when no
    // explicit ?dog= selection is present
    safe((db.from('walk_logs') as any)
      .select('dog_id')
      .eq('owner_id', user.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()),
  ])

  const userMeta = user.user_metadata ?? {}
  const displayName: string =
    (profileData as { full_name?: string } | null)?.full_name ??
    userMeta.full_name ??
    userMeta.name ??
    user.email?.split('@')[0] ??
    'there'

  type DogRow = { id: string; name: string; breed: string | null; photo_url: string | null; health_notes: string | null; created_at: string }
  const dogs: DogRow[] = dogsRaw ?? []
  const walkerConnections = walkerConnectionsRaw ?? []
  const isPro = entitlement.isPro

  // Determine the selected dog: explicit ?dog= param wins if it matches one of
  // this owner's dogs; otherwise fall back to whichever dog has the most
  // recent walk activity; otherwise the first dog by created_at.
  const mostRecentDogId = (mostRecentLogData as { dog_id?: string } | null)?.dog_id ?? null
  let selectedDog: DogRow | null = null
  if (requestedDogId) {
    selectedDog = dogs.find(d => d.id === requestedDogId) ?? null
  }
  if (!selectedDog && mostRecentDogId) {
    selectedDog = dogs.find(d => d.id === mostRecentDogId) ?? null
  }
  if (!selectedDog) {
    selectedDog = dogs[0] ?? null
  }
  const firstDog = selectedDog

  // Other dogs — only relevant when the parent has 2+ dogs. Kept minimal:
  // just enough to render a collapsed chip (photo, name, walked-today dot).
  const otherDogRows = dogs.filter(d => d.id !== selectedDog?.id)
  let otherDogs: { id: string; name: string; photo_url: string | null; walkedToday: boolean }[] = []
  if (otherDogRows.length > 0) {
    const otherDogIds = otherDogRows.map(d => d.id)
    const { data: otherDogsTodayLogs } = await safe((db.from('walk_logs') as any)
      .select('dog_id')
      .eq('owner_id', user.id)
      .in('dog_id', otherDogIds)
      .gte('started_at', todayMidnight))
    const walkedTodayIds = new Set((otherDogsTodayLogs ?? []).map((l: { dog_id: string }) => l.dog_id))
    otherDogs = otherDogRows.map(d => ({
      id: d.id,
      name: d.name,
      photo_url: d.photo_url,
      walkedToday: walkedTodayIds.has(d.id),
    }))
  }

  // Per-dog stat queries — scoped to BOTH owner_id and dog_id so a parent
  // with multiple dogs doesn't see walks blended across all their dogs.
  const [
    { data: walkLogsRaw },
    { data: latestWalkerReportData },
    { data: latestSelfWalkReportData },
  ] = await Promise.all([
    safe((db.from('walk_logs') as any)
      .select('id, started_at, ended_at, duration_mins, distance_km, poop_count, pee_count, mood, walker_name, logged_by')
      .eq('owner_id', user.id)
      .eq('dog_id', selectedDog?.id ?? '')
      .gte('started_at', fourteenDaysAgoIST())
      .order('started_at', { ascending: false })),

    // Latest walk report token — for direct link from last walk card.
    // walk_reports has no dog_id column directly; a walker-logged report
    // links to the dog via connection_id -> walker_connections.dog_id (inner
    // join below), but a self-walk report has no connection_id at all, so
    // it can never match that join — matched separately by dog_name instead
    // (same fallback pattern used in app/my-reports/page.tsx), and the two
    // results are compared by recency just below.
    selectedDog
      ? safe((db.from('walk_reports') as any)
          .select('token, walk_date, walker_connections!inner(dog_id)')
          .eq('owner_id', user.id)
          .eq('walker_connections.dog_id', selectedDog.id)
          .order('walk_date', { ascending: false })
          .limit(1)
          .maybeSingle())
      : Promise.resolve({ data: null }),

    selectedDog
      ? safe((db.from('walk_reports') as any)
          .select('token, walk_date')
          .eq('owner_id', user.id)
          .eq('logged_by', 'parent')
          .eq('dog_name', selectedDog.name)
          .order('walk_date', { ascending: false })
          .limit(1)
          .maybeSingle())
      : Promise.resolve({ data: null }),
  ])

  // Pick whichever of the two is more recent — a self-walk logged today
  // should win over a walker report from three days ago, and vice versa.
  type ReportPick = { token: string; walk_date: string } | null
  const walkerReport = latestWalkerReportData as ReportPick
  const selfWalkReport = latestSelfWalkReportData as ReportPick
  const latestReportData =
    !walkerReport ? selfWalkReport
    : !selfWalkReport ? walkerReport
    : new Date(walkerReport.walk_date).getTime() >= new Date(selfWalkReport.walk_date).getTime()
      ? walkerReport
      : selfWalkReport

  // Trial status derived from the shared entitlement helper (keeps this page,
  // /upgrade, and /my-reports from drifting apart on trial-window math).
  // 'lapsed' unifies "trial ran out" and "subscription cancelled/expired" —
  // both get the same "welcome back, resubscribe" treatment, distinct from
  // 'no_trial' which is a genuine first-time visitor (entitlement.hasHistory
  // is false).
  const trialDaysRemaining = entitlement.trialDaysRemaining
  let trialStatus = 'no_trial'
  if (isPro) {
    trialStatus = 'active'
  } else if (entitlement.trialActive) {
    trialStatus = 'trial'
  } else if (entitlement.hasHistory) {
    trialStatus = 'lapsed'
  }

  // Need trial_started_at for the missedWalksCount FOMO query below — re-derive
  // the trial expiry timestamp the same way the entitlement helper does.
  const trialStartedAt: string | null = (profileData as { trial_started_at?: string | null } | null)?.trial_started_at ?? null

  // Compute missedWalksCount — FOMO number for lapsed non-Pro users who did
  // have a trial (trialStartedAt set). For a lapsed *subscription* (no trial
  // ever started), this stays 0 and the banner falls back to generic copy.
  let missedWalksCount = 0
  if (trialStatus === 'lapsed' && !isPro && trialStartedAt) {
    const trialExpiredAt = new Date(new Date(trialStartedAt).getTime() + 3 * 86400 * 1000).toISOString()
    const { count: missed } = await safe((db.from('walk_logs') as any)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .gte('started_at', trialExpiredAt))
    missedWalksCount = missed ?? 0
  }

  const recentLogs = walkLogsRaw ?? []
  // Derive today's logs from the 14-day fetch — no extra round-trip needed
  const todayLogs = recentLogs.filter((l: { started_at: string }) => l.started_at >= todayMidnight)
  const walkStreak = computeStreak(recentLogs)

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const last7Logs = recentLogs.filter((l: { started_at: string }) => l.started_at >= sevenDaysAgo)
  const weekData = computeWeekData(last7Logs)

  const lastWalkLog = recentLogs[0] ?? null
  const todayWalked = todayLogs.length > 0

  return (
    <HomeClient
      displayName={displayName}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      firstDog={firstDog as any}
      otherDogs={otherDogs}
      activeWalk={null}
      completedWalk={null}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walkerConnections={walkerConnections as any}
      lastWalk={null}
      isPro={isPro}
      walkStreak={walkStreak}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      weekData={weekData as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lastWalkLog={lastWalkLog as any}
      todayWalked={todayWalked}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      todayLogs={todayLogs as any}
      trialStatus={trialStatus}
      trialDaysRemaining={trialDaysRemaining}
      trialStartedAt={trialStartedAt}
      missedWalksCount={missedWalksCount}
      totalReports={reportCount ?? 0}
      latestReportToken={(latestReportData as { token?: string } | null)?.token ?? null}
    />
  )
}

