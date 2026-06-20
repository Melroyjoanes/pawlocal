import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/admin/care-system — aggregate stats + recent data for admin dashboard
export async function GET() {
  const db = admin()

  // Fetch counts in parallel
  const [
    { count: total_dogs },
    { count: total_connections },
    { count: active_connections },
    { count: pending_connections },
    { count: total_walk_logs },
    { data: connections },
    { data: walk_logs },
  ] = await Promise.all([
    (db.from('dogs') as any).select('*', { count: 'exact', head: true }),
    (db.from('walker_connections') as any).select('*', { count: 'exact', head: true }),
    (db.from('walker_connections') as any).select('*', { count: 'exact', head: true }).eq('status', 'active'),
    (db.from('walker_connections') as any).select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    (db.from('walk_logs') as any).select('*', { count: 'exact', head: true }),
    (db.from('walker_connections') as any)
      .select(`
        id,
        token,
        walker_name,
        walker_phone,
        walker_role,
        status,
        claimed_at,
        created_at,
        dogs!walker_connections_dog_id_fkey (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50),
    (db.from('walk_logs') as any)
      .select(`
        id,
        walker_name,
        duration_mins,
        poop_count,
        pee_count,
        mood,
        created_at,
        dogs!walk_logs_dog_id_fkey (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const enrichedConnections = (connections ?? []).map((c: any) => ({
    ...c,
    dog_name: c.dogs?.name ?? null,
    dogs: undefined,
  }))

  const enrichedLogs = (walk_logs ?? []).map((l: any) => ({
    ...l,
    dog_name: l.dogs?.name ?? null,
    dogs: undefined,
  }))

  return NextResponse.json({
    stats: {
      total_dogs: total_dogs ?? 0,
      total_connections: total_connections ?? 0,
      active_connections: active_connections ?? 0,
      pending_connections: pending_connections ?? 0,
      total_walk_logs: total_walk_logs ?? 0,
    },
    connections: enrichedConnections,
    walk_logs: enrichedLogs,
  })
}
