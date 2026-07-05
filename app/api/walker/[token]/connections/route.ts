import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const db = admin()

  // Get this connection's walker phone
  const { data: thisConn } = await (db.from('walker_connections') as any)
    .select('walker_phone, walker_name')
    .eq('token', token)
    .single()

  if (!thisConn?.walker_phone) {
    return NextResponse.json([])  // single client, no picker needed
  }

  // Get ALL active connections for this phone
  let { data: allConns, error: allConnsError } = await (db.from('walker_connections') as any)
    .select(`
      id, token, status, walker_phone,
      dogs!walker_connections_dog_id_fkey (
        id, name, breed, photo_url, health_notes, care_focus, walk_time_bucket
      ),
      owner_id
    `)
    .eq('walker_phone', thisConn.walker_phone)
    .eq('status', 'active')

  // walk_time_bucket is a nullable column added in migration 053 — until that
  // migration is run manually against prod, the column won't exist yet. Retry
  // without it rather than silently returning an empty picker to the walker.
  if (allConnsError && /walk_time_bucket/i.test(allConnsError.message ?? '')) {
    ;({ data: allConns, error: allConnsError } = await (db.from('walker_connections') as any)
      .select(`
        id, token, status, walker_phone,
        dogs!walker_connections_dog_id_fkey (
          id, name, breed, photo_url, health_notes, care_focus
        ),
        owner_id
      `)
      .eq('walker_phone', thisConn.walker_phone)
      .eq('status', 'active'))
  }

  if (!allConns?.length) return NextResponse.json([])

  // Get owner first names
  const results = await Promise.all((allConns as any[]).map(async (c: any) => {
    let ownerFirstName = 'Owner'
    if (c.owner_id) {
      try {
        const { data: profile } = await (db.from('profiles') as any)
          .select('full_name')
          .eq('id', c.owner_id)
          .single()
        if (profile?.full_name) ownerFirstName = profile.full_name.split(' ')[0]
      } catch { /* skip */ }
    }

    // Get last walk date
    const { data: lastLog } = await (db.from('walk_logs') as any)
      .select('started_at')
      .eq('connection_id', c.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return {
      token: c.token,
      dogId: c.dogs?.id ?? null,
      dogName: c.dogs?.name ?? 'Dog',
      dogBreed: c.dogs?.breed ?? null,
      dogPhoto: c.dogs?.photo_url ?? null,
      healthNotes: c.dogs?.health_notes ?? null,
      careFocus: c.dogs?.care_focus ?? 'normal',
      walkTimeBucket: c.dogs?.walk_time_bucket ?? null,
      ownerFirstName,
      lastWalkDate: lastLog?.started_at ?? null,
    }
  }))

  return NextResponse.json(results)
}
