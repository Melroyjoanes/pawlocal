import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// A "stalled walk" = a walk that was started but never ended.
// The parent never gets a report and blames their walker, so it is a silent failure.
//
// Two sources, because the app has two generations of walk tracking live at once:
//   walk_logs     — V2 QR flow. Has connection_id / dog_id / owner_id / walker_name.
//   walk_sessions — V1 legacy provider flow. Only has provider_id + free-text pet/customer name.
// Both are read-only here.

const STALL_HOURS = 3

interface StalledWalk {
  id: string
  source: 'walk_log' | 'walk_session'
  dogName: string | null
  walkerName: string | null
  parentName: string | null
  parentEmail: string | null
  parentPhone: string | null
  startedAt: string
  stalledMinutes: number
  stalledHours: number
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const client = db()
  const now = Date.now()
  const cutoff = new Date(now - STALL_HOURS * 3600000).toISOString()

  const [logsRes, sessionsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client.from('walk_logs') as any)
      .select('id, connection_id, dog_id, owner_id, walker_name, started_at')
      .is('ended_at', null)
      .lt('started_at', cutoff)
      .order('started_at', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client.from('walk_sessions') as any)
      .select('id, provider_id, pet_name, customer_name, started_at')
      .is('ended_at', null)
      .lt('started_at', cutoff)
      .order('started_at', { ascending: true }),
  ])

  if (logsRes.error) return NextResponse.json({ error: logsRes.error.message }, { status: 500 })
  if (sessionsRes.error) return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 })

  const logs: Array<{
    id: string; connection_id: string | null; dog_id: string | null
    owner_id: string | null; walker_name: string | null; started_at: string
  }> = logsRes.data ?? []

  const sessions: Array<{
    id: string; provider_id: string | null; pet_name: string | null
    customer_name: string | null; started_at: string
  }> = sessionsRes.data ?? []

  if (!logs.length && !sessions.length) return NextResponse.json([])

  const dogIds = [...new Set(logs.map((l) => l.dog_id).filter(Boolean))] as string[]
  const ownerIds = [...new Set(logs.map((l) => l.owner_id).filter(Boolean))] as string[]
  const providerIds = [...new Set(sessions.map((s) => s.provider_id).filter(Boolean))] as string[]

  const [dogsRes, profilesRes, providersRes, authRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dogIds.length ? (client.from('dogs') as any).select('id, name').in('id', dogIds) : Promise.resolve({ data: [] }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ownerIds.length ? (client.from('profiles') as any).select('id, display_name, phone').in('id', ownerIds) : Promise.resolve({ data: [] }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    providerIds.length ? (client.from('providers') as any).select('id, name, email, phone').in('id', providerIds) : Promise.resolve({ data: [] }),
    ownerIds.length ? client.auth.admin.listUsers({ perPage: 1000 }) : Promise.resolve({ data: { users: [] } }),
  ])

  const dogNameMap: Record<string, string> = {}
  for (const d of (dogsRes.data ?? []) as Array<{ id: string; name: string | null }>) {
    dogNameMap[d.id] = d.name ?? ''
  }

  const profileMap: Record<string, { name: string | null; phone: string | null }> = {}
  for (const p of (profilesRes.data ?? []) as Array<{ id: string; display_name: string | null; phone: string | null }>) {
    profileMap[p.id] = { name: p.display_name ?? null, phone: p.phone ?? null }
  }

  const providerMap: Record<string, { name: string | null; email: string | null; phone: string | null }> = {}
  for (const p of (providersRes.data ?? []) as Array<{ id: string; name: string | null; email: string | null; phone: string | null }>) {
    providerMap[p.id] = { name: p.name ?? null, email: p.email ?? null, phone: p.phone ?? null }
  }

  const emailMap: Record<string, string> = {}
  for (const u of authRes.data?.users ?? []) {
    if (u.id) emailMap[u.id] = u.email ?? ''
  }

  function elapsed(startedAt: string) {
    const mins = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000))
    return { stalledMinutes: mins, stalledHours: Math.floor(mins / 60) }
  }

  const out: StalledWalk[] = []

  for (const l of logs) {
    const profile = l.owner_id ? profileMap[l.owner_id] : undefined
    out.push({
      id: l.id,
      source: 'walk_log',
      dogName: (l.dog_id ? dogNameMap[l.dog_id] : null) || null,
      walkerName: l.walker_name || null,
      parentName: profile?.name ?? null,
      parentEmail: (l.owner_id ? emailMap[l.owner_id] : null) || null,
      parentPhone: profile?.phone ?? null,
      startedAt: l.started_at,
      ...elapsed(l.started_at),
    })
  }

  for (const s of sessions) {
    const provider = s.provider_id ? providerMap[s.provider_id] : undefined
    out.push({
      id: s.id,
      source: 'walk_session',
      dogName: s.pet_name || null,
      // V1 sessions have no walker record, the provider account is the walker.
      walkerName: provider?.name ?? null,
      parentName: s.customer_name || null,
      parentEmail: provider?.email ?? null,
      parentPhone: provider?.phone ?? null,
      startedAt: s.started_at,
      ...elapsed(s.started_at),
    })
  }

  // Oldest first — the longest stalled walk is the most damaging.
  out.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())

  return NextResponse.json(out)
}
