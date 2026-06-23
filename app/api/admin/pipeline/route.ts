import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = adminDb()

  // Get all non-admin users (profiles)
  const { data: profiles } = await (db.from('profiles') as any)
    .select('id, full_name, trial_started_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!profiles?.length) return NextResponse.json([])

  const userIds = profiles.map((p: any) => p.id)

  // Batch fetch lifecycle data
  const [dogsRes, connectionsRes, walkLogsRes, walkReportsRes, subsRes] = await Promise.all([
    (db.from('dogs') as any).select('owner_id').in('owner_id', userIds),
    (db.from('walker_connections') as any).select('owner_id, status').in('owner_id', userIds),
    (db.from('walk_logs') as any).select('owner_id').in('owner_id', userIds),
    (db.from('walk_reports') as any).select('owner_id, customer_id, quality_score').in('owner_id', userIds),
    (db.from('subscriptions') as any).select('user_id, status, plan').eq('status', 'active').in('user_id', userIds),
  ])

  const pipeline = await Promise.all(profiles.map(async (profile: any) => {
    const uid = profile.id
    const { data: authUser } = await db.auth.admin.getUserById(uid)
    const email = authUser?.user?.email ?? '—'

    const hasDog = (dogsRes.data ?? []).some((d: any) => d.owner_id === uid)
    const activeConnection = (connectionsRes.data ?? []).some((c: any) => c.owner_id === uid && c.status === 'active')
    const walksCount = (walkLogsRes.data ?? []).filter((l: any) => l.owner_id === uid).length
    const reports = (walkReportsRes.data ?? []).filter((r: any) => r.owner_id === uid)
    const reportOpened = reports.some((r: any) => r.customer_id !== null)
    const avgQuality = reports.length > 0
      ? Math.round(reports.reduce((s: number, r: any) => s + (r.quality_score ?? 0), 0) / reports.length)
      : null
    const isPaid = (subsRes.data ?? []).some((s: any) => s.user_id === uid)

    return {
      id: uid,
      email,
      name: profile.full_name ?? '—',
      trialStarted: !!profile.trial_started_at,
      hasDog,
      walkerConnected: activeConnection,
      walksCount,
      reportsCount: reports.length,
      reportOpened,
      avgQuality,
      isPaid,
      createdAt: profile.created_at,
    }
  }))

  return NextResponse.json(pipeline)
}
