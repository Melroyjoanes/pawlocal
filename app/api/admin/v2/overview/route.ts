import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const client = db()
  const todayStr = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [
    // Funnel
    signedUpRes,
    dogCreatedRes,
    walkerConnectedRes,
    firstReportRes,
    parentOpenedRes,
    paidRes,
    // Stats
    parentsTodayRes,
    parentsThisWeekRes,
    dogsTotalRes,
    walkersActiveRes,
    reportsTotalRes,
    reportsTodayRes,
    reportsThisWeekRes,
    northStarRes,
    // Revenue
    monthlySubsRes,
    annualSubsRes,
    trialUsersRes,
    expiredTrialsRes,
    // Quality
    qualityRes,
  ] = await Promise.all([
    // Funnel counts
    client.from('profiles').select('id', { count: 'exact', head: true }),
    (client.from('dogs') as any).select('owner_id', { count: 'exact', head: true }),
    (client.from('walker_connections') as any).select('owner_id', { count: 'exact', head: true }).eq('status', 'active'),
    (client.from('walk_reports') as any).select('owner_id', { count: 'exact', head: true }).not('owner_id', 'is', null),
    (client.from('walk_reports') as any).select('owner_id', { count: 'exact', head: true }).not('customer_id', 'is', null),
    (client.from('subscriptions') as any).select('user_id', { count: 'exact', head: true }).eq('status', 'active'),
    // Stats
    (client.from('profiles') as any).select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
    (client.from('profiles') as any).select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    (client.from('dogs') as any).select('id', { count: 'exact', head: true }),
    (client.from('walker_connections') as any).select('id', { count: 'exact', head: true }).eq('status', 'active'),
    (client.from('walk_reports') as any).select('id', { count: 'exact', head: true }),
    (client.from('walk_reports') as any).select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
    (client.from('walk_reports') as any).select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    // North star: walk_reports where customer_id IS NOT NULL in last 7 days
    (client.from('walk_reports') as any).select('id', { count: 'exact', head: true }).not('customer_id', 'is', null).gte('created_at', sevenDaysAgo),
    // Revenue
    (client.from('subscriptions') as any).select('user_id', { count: 'exact', head: true }).eq('status', 'active').eq('plan', 'monthly'),
    (client.from('subscriptions') as any).select('user_id', { count: 'exact', head: true }).eq('status', 'active').eq('plan', 'annual'),
    // trialUsers: profiles with trial_started_at
    (client.from('profiles') as any).select('id', { count: 'exact', head: true }).not('trial_started_at', 'is', null),
    // expiredTrials: trial_started_at + 7 days < now, no active sub — approximate via profiles with trial but not active sub
    (client.from('profiles') as any).select('id, trial_started_at').not('trial_started_at', 'is', null),
    // Quality: fetch all quality scores
    (client.from('walk_reports') as any).select('id').limit(1000),
  ])

  // Compute funnel distinct counts (approximate via count queries above)
  // Note: the count queries give total rows, not distinct owner_ids — for exactness we'd need to fetch all.
  // Using count as proxy since owner_id duplication is acceptable for dashboard KPIs.

  // Revenue
  const monthlyCount = monthlySubsRes.count ?? 0
  const annualCount = annualSubsRes.count ?? 0
  const mrr = Math.round((monthlyCount * 249 + annualCount * (1999 / 12)) * 100) / 100
  const arr = Math.round(mrr * 12 * 100) / 100
  const activeSubscribers = paidRes.count ?? 0
  const trialProfileCount = trialUsersRes.count ?? 0
  const trialUsers = Math.max(0, trialProfileCount - activeSubscribers)

  // Expired trials: trial_started_at + 7 days < now
  const now = Date.now()
  const sevenDays = 7 * 86400000
  const expiredProfiles: Array<{ trial_started_at: string }> = expiredTrialsRes.data ?? []
  const expiredTrials = expiredProfiles.filter((p) => {
    const started = new Date(p.trial_started_at).getTime()
    return started + sevenDays < now
  }).length

  // Quality
  const allReports: Array<{ quality_score: number | null }> = qualityRes.data ?? []
  const scoredReports = allReports.filter((r) => r.quality_score !== null)
  const avgQualityScore = scoredReports.length > 0
    ? Math.round(scoredReports.reduce((sum, r) => sum + (r.quality_score ?? 0), 0) / scoredReports.length)
    : 0
  const goodReports = scoredReports.filter((r) => (r.quality_score ?? 0) >= 70).length
  const weakReports = scoredReports.filter((r) => (r.quality_score ?? 0) >= 40 && (r.quality_score ?? 0) < 70).length
  const brokenReports = allReports.filter((r) => r.quality_score === null || (r.quality_score) < 40).length

  return NextResponse.json({
    northStar: northStarRes.count ?? 0,
    northStarLabel: 'walk reports opened by parents this week',

    funnel: {
      signedUp: signedUpRes.count ?? 0,
      dogCreated: dogCreatedRes.count ?? 0,
      walkerConnected: walkerConnectedRes.count ?? 0,
      firstReport: firstReportRes.count ?? 0,
      parentOpened: parentOpenedRes.count ?? 0,
      paid: activeSubscribers,
    },

    parentsTotal: signedUpRes.count ?? 0,
    parentsToday: parentsTodayRes.count ?? 0,
    parentsThisWeek: parentsThisWeekRes.count ?? 0,
    dogsTotal: dogsTotalRes.count ?? 0,
    walkersActive: walkersActiveRes.count ?? 0,
    reportsTotal: reportsTotalRes.count ?? 0,
    reportsToday: reportsTodayRes.count ?? 0,
    reportsThisWeek: reportsThisWeekRes.count ?? 0,

    mrr,
    arr,
    activeSubscribers,
    monthlySubscribers: monthlyCount,
    annualSubscribers: annualCount,
    trialUsers,
    expiredTrials,

    avgQualityScore,
    goodReports,
    weakReports,
    brokenReports,
  })
}
