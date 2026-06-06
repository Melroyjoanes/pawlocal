import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PATCH — end a walk session
export async function PATCH(
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
    .select('id, provider_id, status, distance_km, step_count')
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

  const body = await req.json().catch(() => ({}))
  const distanceKm: number | null = typeof body.distance_km === 'number' ? body.distance_km : null
  const stepCount: number | null = typeof body.step_count === 'number' ? body.step_count : null

  const updateData: Record<string, unknown> = {
    status: 'completed',
    ended_at: new Date().toISOString(),
  }
  if (distanceKm !== null) updateData.distance_km = distanceKm
  if (stepCount !== null) updateData.step_count = stepCount

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (db.from('walk_sessions') as any)
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: updated })
}
