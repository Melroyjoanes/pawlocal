import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { WalkEvent } from '@/lib/supabase/types'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST — append a pee/poop event to the walk session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session } = await (db.from('walk_sessions') as any)
    .select('id, provider_id, status, walk_events')
    .eq('id', id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Session not active' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (db.from('providers') as any)
    .select('id')
    .eq('id', session.provider_id)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!['pee', 'poop'].includes(body.type)) {
    return NextResponse.json({ error: 'type must be pee or poop' }, { status: 400 })
  }

  const newEvent: WalkEvent = {
    type: body.type,
    ts: new Date().toISOString(),
    lat: typeof body.lat === 'number' ? body.lat : undefined,
    lng: typeof body.lng === 'number' ? body.lng : undefined,
  }

  const currentEvents: WalkEvent[] = Array.isArray(session.walk_events) ? session.walk_events : []
  const updatedEvents = [...currentEvents, newEvent]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('walk_sessions') as any)
    .update({ walk_events: updatedEvents })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, event: newEvent })
}
