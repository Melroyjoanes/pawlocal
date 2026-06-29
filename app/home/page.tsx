import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// IST midnight as UTC
function todayMidnightIST(): string {
  const now = new Date()
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(now.getTime() + istOffset)
  const midnightIST = new Date(nowIST)
  midnightIST.setUTCHours(0, 0, 0, 0)
  // Convert back to UTC
  return new Date(midnightIST.getTime() - istOffset).toISOString()
}

function fourteenDaysAgoIST(): string {
  const d = new Date(todayMidnightIST())
  d.setDate(d.getDate() - 14)
  return d.toISOString()
}

function computeStreak(logs: Array<{ started_at: string }>): number {
  if (!logs || logs.length === 0) return 0
  const istOffset = 5.5 * 60 * 60 * 1000
  const toISTDateStr = (iso: string) => {
    const d = new Date(new Date(iso).getTime() + istOffset)
    return d.toISOString().slice(0, 10)
  }
  const walkedDates = new Set(logs.map(l => toISTDateStr(l.started_at)))
  let streak = 0
  const now = new Date(Date.now() + istOffset)
  const check = new Date(now)
  check.setUTCHours(0, 0, 0, 0)
  while (walkedDates.has(check.toISOString().slice(0, 10))) {
    streak++
    check.setDate(check.getDate() - 1)
  }
  return streak
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

export default async function HomePage() {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth_required=1&next=/home')

  // Wrap everything in try-catch — if any query or env var is missing,
  // still render the page with defaults rather than showing a blank crash screen
  try {
    return await renderHome(user)
  } catch (err) {
    console.error('[home] render error:', err)
    return (
      <HomeClient
        displayName={user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'there'}
        firstDog={null}
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

async function renderHome(user: { id: string; user_metadata?: Record<string, string> | null; email?: string | null }) {
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
    { data: subData },
    { data: trialProfileData },
    { data: walkLogsRaw },
    { count: reportCount },
    { data: latestReportData },
  ] = await Promise.all([
    safe((db.from('profiles') as any)
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()),

    safe((db.from('dogs') as any)
      .select('id, name, breed, photo_url, health_notes')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)),

    safe((db.from('walker_connections') as any)
      .select('id, walker_name, walker_phone, walker_role, status, dog_id, token, dogs(name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })),

    safe((db.from('subscriptions') as any)
      .select('plan, status, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()),

    safe((db.from('profiles') as any)
      .select('trial_started_at')
      .eq('id', user.id)
      .maybeSingle()),

    safe((db.from('walk_logs') as any)
      .select('id, started_at, ended_at, duration_mins, distance_km, poop_count, pee_count, mood, walker_name')
      .eq('owner_id', user.id)
      .gte('started_at', fourteenDaysAgoIST())
      .order('started_at', { ascending: false })),

    safe((db.from('walk_logs') as any)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)),

    // Latest walk report token — for direct link from last walk card
    safe((db.from('walk_reports') as any)
      .select('token')
      .eq('owner_id', user.id)
      .order('walk_date', { ascending: false })
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

  const firstDog = dogsRaw?.[0] ?? null
  const walkerConnections = walkerConnectionsRaw ?? []
  const isPro = !!subData

  // Compute trial status from profiles.trial_started_at
  const trialStartedAt: string | null = (trialProfileData as { trial_started_at?: string | null } | null)?.trial_started_at ?? null
  const TRIAL_DAYS = 3
  let trialStatus = 'no_trial'
  let trialDaysRemaining: number | null = null
  if (!isPro && trialStartedAt) {
    const msRemaining = new Date(trialStartedAt).getTime() + TRIAL_DAYS * 86400 * 1000 - Date.now()
    if (msRemaining > 0) {
      trialStatus = 'trial'
      trialDaysRemaining = Math.ceil(msRemaining / 86400000)
    } else {
      trialStatus = 'expired'
    }
  } else if (isPro) {
    trialStatus = 'active'
  }

  // Compute missedWalksCount — FOMO number for expired trial non-Pro users
  let missedWalksCount = 0
  if (trialStatus === 'expired' && !isPro && trialStartedAt) {
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

