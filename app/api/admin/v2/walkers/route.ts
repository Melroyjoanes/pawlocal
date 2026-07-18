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

  // 1. Fetch walkers
  const { data: walkers, error } = await (client.from('walkers') as any)
    .select('id, name, phone, total_walks, first_seen_at, last_seen_at')
    .order('last_seen_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!walkers?.length) return NextResponse.json([])

  const walkerList: Array<{
    id: string
    name: string
    phone: string
    total_walks: number | null
    first_seen_at: string
    last_seen_at: string
  }> = walkers

  const walkerIds: string[] = walkerList.map((w) => w.id)
  const walkerPhones: string[] = walkerList.map((w) => w.phone).filter(Boolean)

  // 2. Fetch walker_connections for these walkers (by walker_id or phone)
  const [connByIdRes, connByPhoneRes] = await Promise.all([
    (client.from('walker_connections') as any)
      .select('id, walker_id, owner_id, dog_name, status, token, otp')
      .in('walker_id', walkerIds),
    walkerPhones.length > 0
      ? (client.from('walker_connections') as any)
          .select('id, walker_phone, owner_id, dog_name, status, token, otp')
          .in('walker_phone', walkerPhones)
      : Promise.resolve({ data: [] }),
  ])

  // Merge connections, dedup by id
  const allConnections: Array<{
    id: string
    walker_id?: string
    walker_phone?: string
    owner_id: string
    dog_name: string | null
    status: string
    token: string
    otp: string | null
  }> = []
  const seenConnIds = new Set<string>()
  for (const c of [...(connByIdRes.data ?? []), ...(connByPhoneRes.data ?? [])]) {
    if (!seenConnIds.has(c.id)) {
      seenConnIds.add(c.id)
      allConnections.push(c)
    }
  }

  const connIds: string[] = allConnections.map((c) => c.id)

  // 3. Fetch report counts and avg quality per connection
  const { data: reportRows } = connIds.length > 0
    ? await (client.from('walk_reports') as any)
        .select('connection_id, quality_score')
        .in('connection_id', connIds)
    : { data: [] }

  const reportsByConn: Record<string, Array<{ quality_score: number | null }>> = {}
  for (const r of (reportRows ?? [])) {
    if (!r.connection_id) continue
    if (!reportsByConn[r.connection_id]) reportsByConn[r.connection_id] = []
    reportsByConn[r.connection_id].push({ quality_score: r.quality_score ?? null })
  }

  // 4. Fetch owner profiles for names, with auth email as fallback — most
  // owners never get a profiles row (lazy creation), so full_name is usually
  // missing and the email is the only human-readable identity we have.
  const ownerIds: string[] = [...new Set(allConnections.map((c) => c.owner_id).filter(Boolean))]
  const [profilesRes, authRes] = await Promise.all([
    ownerIds.length > 0
      ? (client.from('profiles') as any).select('id, full_name').in('id', ownerIds)
      : Promise.resolve({ data: [] }),
    client.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const ownerNameMap: Record<string, string | null> = {}
  for (const o of (profilesRes.data ?? [])) {
    ownerNameMap[o.id] = o.full_name ?? null
  }
  const ownerEmailMap: Record<string, string> = {}
  for (const u of (authRes.data?.users ?? [])) {
    if (u.email) ownerEmailMap[u.id] = u.email
  }

  // Build result
  const result = walkerList.map((w) => {
    // Match connections by walker_id or phone
    const wConns = allConnections.filter(
      (c) => c.walker_id === w.id || c.walker_phone === w.phone
    )

    const connections = wConns.map((c) => {
      const connReports = reportsByConn[c.id] ?? []
      const scored = connReports.filter((r) => r.quality_score !== null)
      const avgQuality = scored.length > 0
        ? Math.round(scored.reduce((sum, r) => sum + (r.quality_score ?? 0), 0) / scored.length)
        : null

      return {
        dogName: c.dog_name ?? '',
        ownerName: ownerNameMap[c.owner_id] ?? null,
        ownerEmail: ownerEmailMap[c.owner_id] ?? null,
        status: c.status,
        reportCount: connReports.length,
        avgQuality,
        token: c.token,
        otp: c.otp ?? null,
      }
    })

    return {
      id: w.id,
      name: w.name,
      phone: w.phone,
      totalWalks: w.total_walks ?? 0,
      firstSeenAt: w.first_seen_at,
      lastSeenAt: w.last_seen_at,
      connections,
    }
  })

  return NextResponse.json(result)
}
