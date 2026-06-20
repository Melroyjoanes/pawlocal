import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/walker/[token]/logs — public, returns last 10 walk logs for a connection token
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const db = admin()

  // Look up the connection
  const { data: connection, error: connError } = await (db.from('walker_connections') as any)
    .select('id')
    .eq('token', token)
    .single()

  if (connError || !connection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: logs, error: logsError } = await (db.from('walk_logs') as any)
    .select('id, duration_mins, poop_count, pee_count, mood, notes, distance_km, created_at')
    .eq('connection_id', connection.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 })
  }

  return NextResponse.json(logs ?? [])
}
