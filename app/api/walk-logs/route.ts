import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/walk-logs — returns all walk logs for authenticated user's dogs
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (admin().from('walk_logs') as any)
    .select(`
      *,
      dogs!walk_logs_dog_id_fkey (
        name
      )
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/walk-logs — walker submits a walk log (no auth required)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    connection_token,
    duration_mins,
    poop_count,
    pee_count,
    mood,
    notes,
    distance_km,
    started_at,
    ended_at,
    gps_route,
    photo_url,
  } = body

  if (!connection_token) {
    return NextResponse.json({ error: 'connection_token is required' }, { status: 400 })
  }

  const db = admin()

  // Look up the walker_connection by token
  const { data: connection, error: connError } = await (db.from('walker_connections') as any)
    .select('id, dog_id, owner_id, walker_name, status')
    .eq('token', connection_token)
    .single()

  if (connError || !connection) {
    return NextResponse.json({ error: 'Invalid connection token' }, { status: 404 })
  }

  if (connection.status !== 'active') {
    return NextResponse.json({ error: 'Connection is not active' }, { status: 403 })
  }

  const { data: log, error: insertError } = await (db.from('walk_logs') as any)
    .insert({
      connection_id: connection.id,
      dog_id: connection.dog_id,
      owner_id: connection.owner_id,
      walker_name: connection.walker_name ?? null,
      duration_mins: duration_mins ?? null,
      poop_count: poop_count ?? 0,
      pee_count: pee_count ?? 0,
      mood: mood ?? null,
      notes: notes ?? null,
      distance_km: distance_km ?? null,
      started_at: started_at ?? new Date().toISOString(),
      ended_at: ended_at ?? null,
      gps_route: gps_route ?? null,
      photo_url: photo_url ?? null,
    })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true, log_id: log.id }, { status: 201 })
}
