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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/?auth_required=1&next=/home')
  }

  const db = admin()
  const todayMidnight = todayMidnightIST()

  const [
    { data: profileData },
    { data: dogsRaw },
    { data: activeWalkRaw },
    { data: completedWalkRaw },
    { data: walkerConnectionsRaw },
    { data: lastWalkRaw },
    { data: subData },
    { data: walkLogsRaw },
    { data: trialProfileData },
    { count: reportCount },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('profiles') as any)
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('dogs') as any)
      .select('id, name, breed, photo_url, health_notes')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1),

    // Active walk session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_sessions') as any)
      .select('id, share_token, pet_name, started_at, provider_id, providers(name)')
      .eq('parent_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),

    // Completed walk today (IST)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_sessions') as any)
      .select('id, share_token, pet_name, started_at, ended_at, distance_meters, provider_id, providers(name)')
      .eq('parent_user_id', user.id)
      .eq('status', 'ended')
      .gte('started_at', todayMidnight)
      .order('started_at', { ascending: false })
      .limit(1),

    // Walker connections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walker_connections') as any)
      .select('id, walker_name, walker_phone, walker_role, status, dog_id, dogs(name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),

    // Most recent walk session (any status) for "last walked" display
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_sessions') as any)
      .select('id, started_at, ended_at, status')
      .eq('parent_user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(1),

    // Active subscription check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('subscriptions') as any)
      .select('plan, status, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle(),

    // Trial status from profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('profiles') as any)
      .select('trial_started_at')
      .eq('id', user.id)
      .maybeSingle(),

    // Walk logs last 14 days — covers streak, week grid, last walk, AND today (derived below)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_logs') as any)
      .select('id, started_at, ended_at, duration_mins, distance_km, poop_count, pee_count, mood, walker_name')
      .eq('owner_id', user.id)
      .gte('started_at', fourteenDaysAgoIST())
      .order('started_at', { ascending: false }),

    // Total walk reports count for trial conversion banner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_reports') as any)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id),
  ])

  const userMeta = user.user_metadata ?? {}
  const displayName: string =
    (profileData as { full_name?: string } | null)?.full_name ??
    userMeta.full_name ??
    userMeta.name ??
    user.email?.split('@')[0] ??
    'there'

  const firstDog = dogsRaw?.[0] ?? null
  const activeWalk = activeWalkRaw ?? null
  const completedWalk = completedWalkRaw?.[0] ?? null
  const walkerConnections = walkerConnectionsRaw ?? []
  const lastWalk = lastWalkRaw?.[0] ?? null
  const isPro = !!subData

  // Compute trial status from profiles.trial_started_at
  const trialStartedAt: string | null = (trialProfileData as { trial_started_at?: string | null } | null)?.trial_started_at ?? null
  const TRIAL_DAYS = 14
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeWalk={activeWalk as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completedWalk={completedWalk as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walkerConnections={walkerConnections as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lastWalk={lastWalk as any}
      isPro={isPro}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      totalReports={reportCount ?? 0}
    />
  )
}
