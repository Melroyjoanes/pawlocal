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
    // V2 parents = those with at least one dog. This MUST be a distinct count of
    // owners, not a row count: count:'exact' counts dog ROWS, so a parent with
    // three dogs was being counted three times. Fetch the owner ids and dedupe below.
    (client.from('dogs') as any).select('owner_id, created_at').limit(2000),
    // V2 walkers connected
    (client.from('walker_connections') as any).select('owner_id').eq('status', 'active').limit(2000),
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

  // Distinct owners, not row counts. Previously this reported 17 (dog rows) when
  // there were only 8 actual parents.
  const distinctOwners = (rows: { data?: { owner_id?: string | null }[] | null }) =>
    new Set(((rows?.data ?? []) as { owner_id?: string | null }[])
      .map(r => r.owner_id).filter(Boolean) as string[]).size
  const parentsV2 = distinctOwners(dogsRes)

  // Signed up must come from auth.users, not from dogs. Previously signedUp and
  // dogCreated were both set to parentsV2, so the first funnel step always read
  // 8 -> 8 and the single biggest activation problem was invisible: most people
  // who sign up never create a dog at all.
  let signedUpTotal = parentsV2
  try {
    const { data: authList } = await client.auth.admin.listUsers({ perPage: 1000 })
    if (authList?.users?.length) signedUpTotal = authList.users.length
  } catch {
    // fall back to parentsV2 rather than failing the whole dashboard
  }

  // parentsToday / parentsThisWeek were hardcoded 0 with a "skip for now" note,
  // so the tiles displayed a fake zero as if it were real. Compute them properly.
  const dogRows = ((dogsRes?.data ?? []) as { owner_id?: string | null; created_at?: string | null }[])
  const ownersSince = (iso: string) =>
    new Set(dogRows.filter(d => (d.created_at ?? '') >= iso).map(d => d.owner_id).filter(Boolean) as string[]).size

  return NextResponse.json({
    northStar: northStarRes.count ?? 0,
    northStarLabel: 'walk reports opened by parents this week',

    funnel: {
      signedUp: signedUpTotal,
      dogCreated: parentsV2,
      walkerConnected: distinctOwners(walkerConnRes),
      firstReport: firstReportRes.count ?? 0,
      parentOpened: parentOpenedRes.count ?? 0,
      paid: activeSubscribers,
    },

    parentsTotal: parentsV2,
    parentsToday: ownersSince(todayStr),
    parentsThisWeek: ownersSince(sevenDaysAgo),
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
