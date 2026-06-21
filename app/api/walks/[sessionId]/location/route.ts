import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/walks/[sessionId]/location — works for both auth and anonymous walkers
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const body = await req.json().catch(() => ({}))
  const lat = Number(body.lat)
  const lng = Number(body.lng)

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const db = admin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session } = await (db.from('walk_sessions') as any)
    .select('id, status, started_at')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Session not active' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('walk_locations') as any).insert({
    session_id: sessionId,
    lat,
    lng,
    accuracy: typeof body.accuracy === 'number' ? body.accuracy : null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const durationSeconds = Math.floor(
    (Date.now() - new Date(session.started_at).getTime()) / 1000
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from('walk_sessions') as any)
    .update({ duration_seconds: durationSeconds })
    .eq('id', sessionId)

  return NextResponse.json({ ok: true })
}
