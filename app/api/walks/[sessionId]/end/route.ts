import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/walks/[sessionId]/end — works for both auth and anonymous walkers
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const body = await req.json().catch(() => ({}))

  const db = admin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session } = await (db.from('walk_sessions') as any)
    .select('id, status, started_at')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Session not active' }, { status: 400 })

  const durationSeconds = Math.floor(
    (Date.now() - new Date(session.started_at).getTime()) / 1000
  )
  const distanceMeters: number = typeof body.distance_meters === 'number' ? body.distance_meters : 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('walk_sessions') as any)
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      distance_meters: distanceMeters,
      duration_seconds: durationSeconds,
      route: body.route ?? null,
    })
    .eq('id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, duration_seconds: durationSeconds, distance_meters: distanceMeters })
}
