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

  const [approvedRes, pendingRes, rejectedRes, broadcastRes, providersRes, analyticsRes, walkReportsRes, claimedRes] = await Promise.all([
    db.from('providers').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    db.from('providers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('providers').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    db.from('broadcasts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('providers').select('id, name, category_slug, neighbourhood, created_at').eq('status', 'approved').order('created_at', { ascending: false }),
    db.from('provider_analytics').select('provider_id, event_type'),
    db.from('walk_reports').select('id', { count: 'exact', head: true }),
    db.from('walk_reports').select('id', { count: 'exact', head: true }).not('customer_id', 'is', null),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analytics: any[] = analyticsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const providerList: any[] = providersRes.data ?? []

  const providerStats = providerList.map((p) => {
    const events = analytics.filter((a) => a.provider_id === p.id)
    return {
      id: p.id,
      name: p.name,
      category: p.category_slug,
      neighbourhood: p.neighbourhood ?? 'Juhu',
      created_at: p.created_at,
      whatsapp_clicks: events.filter((a) => a.event_type === 'whatsapp_click').length,
      profile_views: events.filter((a) => a.event_type === 'view').length,
    }
  }).sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks)

  return NextResponse.json({
    totalApproved: approvedRes.count ?? 0,
    totalPending: pendingRes.count ?? 0,
    totalRejected: rejectedRes.count ?? 0,
    totalBroadcasts: broadcastRes.count ?? 0,
    totalWalkReports: walkReportsRes.count ?? 0,
    claimedReports: claimedRes.count ?? 0,
    providerStats,
  })
}
