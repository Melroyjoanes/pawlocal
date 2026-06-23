import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/stats — returns all stats for the stats tab
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = adminDb()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [approvedRes, pendingRes, rejectedRes, broadcastRes, providersRes, analyticsRes, walkReportsRes, claimedRes, walkReportsByProviderRes, careCardViewRes] = await Promise.all([
    db.from('providers').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    db.from('providers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('providers').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    db.from('broadcasts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('providers').select('id, name, category_slug, neighbourhood, created_at').eq('status', 'approved').order('created_at', { ascending: false }),
    db.from('provider_analytics').select('provider_id, event_type'),
    db.from('walk_reports').select('id', { count: 'exact', head: true }),
    db.from('walk_reports').select('id', { count: 'exact', head: true }).not('customer_id', 'is', null),
    db.from('walk_reports').select('provider_id').gte('created_at', thirtyDaysAgo.toISOString()),
    db.from('provider_analytics').select('provider_id').eq('event_type', 'care_card_view').gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  // SaaS metrics queries
  const [activeSubsRes, monthlySubsRes, annualSubsRes, trialUsersRes, newSubsThisMonthRes, cancelledThisMonthRes, pastDueRes, recentSubsRes] = await Promise.all([
    db.from('subscriptions').select('user_id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('subscriptions').select('user_id', { count: 'exact', head: true }).eq('status', 'active').eq('plan', 'monthly'),
    db.from('subscriptions').select('user_id', { count: 'exact', head: true }).eq('status', 'active').eq('plan', 'annual'),
    db.from('profiles').select('id', { count: 'exact', head: true }).not('trial_started_at', 'is', null),
    db.from('subscriptions').select('user_id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()).eq('status', 'active'),
    db.from('subscriptions').select('user_id', { count: 'exact', head: true }).eq('status', 'cancelled').gte('created_at', thirtyDaysAgo.toISOString()),
    db.from('subscriptions').select('user_id', { count: 'exact', head: true }).eq('status', 'past_due'),
    db.from('subscriptions').select('user_id, plan, status, amount_paise, expires_at, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analytics: any[] = analyticsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const providerList: any[] = providersRes.data ?? []

  // Build per-provider report counts
  const reportsSentMap: Record<string, number> = {}
  for (const r of (walkReportsByProviderRes.data ?? [])) {
    reportsSentMap[r.provider_id] = (reportsSentMap[r.provider_id] ?? 0) + 1
  }
  const reportsViewedMap: Record<string, number> = {}
  for (const v of (careCardViewRes.data ?? [])) {
    reportsViewedMap[v.provider_id] = (reportsViewedMap[v.provider_id] ?? 0) + 1
  }

  const providerStats = providerList.map((p) => {
    const events = analytics.filter((a) => a.provider_id === p.id)
    const sent = reportsSentMap[p.id] ?? 0
    const viewed = reportsViewedMap[p.id] ?? 0
    return {
      id: p.id,
      name: p.name,
      category: p.category_slug,
      neighbourhood: p.neighbourhood ?? 'Juhu',
      created_at: p.created_at,
      whatsapp_clicks: events.filter((a) => a.event_type === 'whatsapp_click').length,
      profile_views: events.filter((a) => a.event_type === 'view').length,
      reports_sent: sent,
      reports_viewed: viewed,
      open_rate: sent > 0 ? Math.round((viewed / sent) * 100) : 0,
    }
  }).sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks)

  const monthlyCount = monthlySubsRes.count ?? 0
  const annualCount = annualSubsRes.count ?? 0
  const mrr = Math.round((monthlyCount * 249 + annualCount * (1999 / 12)) * 100) / 100
  const arr = Math.round(mrr * 12 * 100) / 100

  return NextResponse.json({
    totalApproved: approvedRes.count ?? 0,
    totalPending: pendingRes.count ?? 0,
    totalRejected: rejectedRes.count ?? 0,
    totalBroadcasts: broadcastRes.count ?? 0,
    totalWalkReports: walkReportsRes.count ?? 0,
    claimedReports: claimedRes.count ?? 0,
    providerStats,
    mrr,
    arr,
    activeSubscribers: activeSubsRes.count ?? 0,
    monthlySubscribers: monthlyCount,
    annualSubscribers: annualCount,
    trialUsers: trialUsersRes.count ?? 0,
    newSubscribersThisMonth: newSubsThisMonthRes.count ?? 0,
    cancelledThisMonth: cancelledThisMonthRes.count ?? 0,
    pastDueCount: pastDueRes.count ?? 0,
    recentSubscriptions: recentSubsRes.data ?? [],
  })
}
