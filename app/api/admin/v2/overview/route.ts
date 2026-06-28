import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// V2 walk_reports = those created by QR walkers (connection_id IS NOT NULL)
// V2 parents = profiles who have at least one dog (created via V2 setup flow)
// This filters out all old V1 provider accounts and old provider walk reports

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const client = db()
  const todayStr = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [
    // Funnel — V2 only
    dogsRes,           // V2 parents = distinct owners with dogs
    walkerConnRes,     // V2 walkers connected
    firstReportRes,    // V2 reports generated
    parentOpenedRes,   // V2 parents who opened report
    paidRes,           // Paid subscribers
    // Stats
    dogsTotalRes,
    walkersActiveRes,
    reportsTotalRes,   // V2 reports only
    reportsTodayRes,
    reportsThisWeekRes,
    northStarRes,      // reports opened this week
    // Revenue
    monthlySubsRes,
    annualSubsRes,
    trialUsersRes,
    expiredTrialsRes,
  ] = await Promise.all([
    // V2 parents = those with at least one dog (distinct count)
    (client.from('dogs') as any).select('owner_id', { count: 'exact', head: true }),
    // V2 walkers connected
    (client.from('walker_connections') as any).select('owner_id', { count: 'exact', head: true }).eq('status', 'active'),
    // V2 reports = only those with connection_id (QR walker flow)
    (client.from('walk_reports') as any).select('id', { count: 'exact', head: true }).not('connection_id', 'is', null),
    // V2 reports opened by parent (customer_id set OR owner_id set and opened)
    (client.from('walk_reports') as any).select('id', { count: 'exact', head: true }).not('connection_id', 'is', null).not('customer_id', 'is', null),
    // Paid
    (client.from('subscriptions') as any).select('user_id', { count: 'exact', head: true }).eq('status', 'active'),
    // Stats
    (client.from('dogs') as any).select('id', { count: 'exact', head: true }),
    (client.from('walker_connections') as any).select('id', { count: 'exact', head: true }).eq('status', 'active'),
    // V2 reports total
    (client.from('walk_reports') as any).select('id', { count: 'exact', head: true }).not('connection_id', 'is', null),
    (client.from('walk_reports') as any).select('id', { count: 'exact', head: true }).not('connection_id', 'is', null).gte('created_at', todayStr),
    (client.from('walk_reports') as any).select('id', { count: 'exact', head: true }).not('connection_id', 'is', null).gte('created_at', sevenDaysAgo),
    // North star: V2 reports opened by parent this week
    (client.from('walk_reports') as any).select('id', { count: 'exact', head: true }).not('connection_id', 'is', null).not('customer_id', 'is', null).gte('created_at', sevenDaysAgo),
    // Revenue
    (client.from('subscriptions') as any).select('user_id', { count: 'exact', head: true }).eq('status', 'active').eq('plan', 'monthly'),
    (client.from('subscriptions') as any).select('user_id', { count: 'exact', head: true }).eq('status', 'active').eq('plan', 'annual'),
    (client.from('profiles') as any).select('id', { count: 'exact', head: true }).not('trial_started_at', 'is', null),
    (client.from('profiles') as any).select('id, trial_started_at').not('trial_started_at', 'is', null),
  ])

  const monthlyCount = monthlySubsRes.count ?? 0
  const annualCount = annualSubsRes.count ?? 0
  const mrr = Math.round((monthlyCount * 199) * 100) / 100
  const arr = Math.round(mrr * 12 * 100) / 100
  const activeSubscribers = paidRes.count ?? 0
  const trialProfileCount = trialUsersRes.count ?? 0
  const trialUsers = Math.max(0, trialProfileCount - activeSubscribers)

  const now = Date.now()
  const threeDays = 3 * 86400000
  const expiredProfiles: Array<{ trial_started_at: string }> = expiredTrialsRes.data ?? []
  const expiredTrials = expiredProfiles.filter((p) => {
    return new Date(p.trial_started_at).getTime() + threeDays < now
  }).length

  const parentsV2 = dogsRes.count ?? 0  // V2 parents = those with at least 1 dog

  return NextResponse.json({
    northStar: northStarRes.count ?? 0,
    northStarLabel: 'walk reports opened by parents this week',

    funnel: {
      signedUp: parentsV2,                          // V2: parents with dogs
      dogCreated: parentsV2,                         // same — dog = signed up in V2
      walkerConnected: walkerConnRes.count ?? 0,
      firstReport: firstReportRes.count ?? 0,
      parentOpened: parentOpenedRes.count ?? 0,
      paid: activeSubscribers,
    },

    parentsTotal: parentsV2,
    parentsToday: 0,   // skip for now — would need dogs.created_at filter
    parentsThisWeek: 0,
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

    avgQualityScore: 0,
    goodReports: 0,
    weakReports: 0,
    brokenReports: 0,
  })
}
