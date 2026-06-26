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

  // 1. Fetch all profiles (limit 100 most recent)
  const { data: profiles } = await (client.from('profiles') as any)
    .select('id, full_name, trial_started_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!profiles?.length) return NextResponse.json([])

  const userIds: string[] = profiles.map((p: any) => p.id as string)

  // 2-5. Batch fetch related data
  const [dogsRes, connectionsRes, reportsRes, subsRes, authRes] = await Promise.all([
    (client.from('dogs') as any).select('owner_id').in('owner_id', userIds),
    (client.from('walker_connections') as any).select('owner_id, status').in('owner_id', userIds),
    (client.from('walk_reports') as any).select('owner_id, created_at').in('owner_id', userIds).order('created_at', { ascending: false }),
    (client.from('subscriptions') as any).select('user_id, plan, status').in('user_id', userIds),
    client.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const dogs: Array<{ owner_id: string }> = dogsRes.data ?? []
  const connections: Array<{ owner_id: string; status: string }> = connectionsRes.data ?? []
  const reports: Array<{ owner_id: string; created_at: string }> = reportsRes.data ?? []
  const subs: Array<{ user_id: string; plan: string; status: string }> = subsRes.data ?? []
  const authUsers = authRes.data?.users ?? []

  // Build email map from auth users
  const emailMap: Record<string, string> = {}
  for (const u of authUsers) {
    emailMap[u.id] = u.email ?? ''
  }

  // Build dog count map
  const dogCountMap: Record<string, number> = {}
  for (const d of dogs) {
    dogCountMap[d.owner_id] = (dogCountMap[d.owner_id] ?? 0) + 1
  }

  // Build active walker count map
  const activeWalkerMap: Record<string, number> = {}
  for (const c of connections) {
    if (c.status === 'active') {
      activeWalkerMap[c.owner_id] = (activeWalkerMap[c.owner_id] ?? 0) + 1
    }
  }

  // Build report count and last report date map
  const reportCountMap: Record<string, number> = {}
  const lastReportMap: Record<string, string> = {}
  for (const r of reports) {
    if (!r.owner_id) continue
    reportCountMap[r.owner_id] = (reportCountMap[r.owner_id] ?? 0) + 1
    if (!lastReportMap[r.owner_id]) {
      lastReportMap[r.owner_id] = r.created_at
    }
  }

  // Build subscription map (latest active sub per user)
  const subMap: Record<string, { plan: string; status: string }> = {}
  for (const s of subs) {
    if (!subMap[s.user_id] || s.status === 'active') {
      subMap[s.user_id] = { plan: s.plan, status: s.status }
    }
  }

  const now = Date.now()
  const sevenDays = 7 * 86400000

  const result = profiles.map((p: any) => {
    const trialStartedAt: string | null = p.trial_started_at ?? null
    let trialDaysRemaining: number | null = null
    let trialExpired = false

    if (trialStartedAt) {
      const trialEnd = new Date(trialStartedAt).getTime() + sevenDays
      const remaining = Math.ceil((trialEnd - now) / 86400000)
      trialDaysRemaining = remaining
      trialExpired = remaining <= 0
    }

    const sub = subMap[p.id] ?? null

    return {
      id: p.id as string,
      name: (p.full_name as string | null) ?? '',
      email: emailMap[p.id] ?? '',
      phone: (p.phone as string | null) ?? null,
      trialStartedAt,
      trialDaysRemaining,
      trialExpired,
      plan: sub?.plan ?? null,
      subStatus: sub?.status ?? null,
      dogCount: dogCountMap[p.id] ?? 0,
      activeWalkers: activeWalkerMap[p.id] ?? 0,
      reportCount: reportCountMap[p.id] ?? 0,
      lastReportDate: lastReportMap[p.id] ?? null,
      createdAt: p.created_at as string,
    }
  })

  return NextResponse.json(result)
}
