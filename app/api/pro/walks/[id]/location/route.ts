import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PATCH — update GPS position for a walk session
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session } = await (db.from('walk_sessions') as any)
    .select('id, provider_id, status')
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
  const lat = Number(body.lat)
  const lng = Number(body.lng)

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('walk_sessions') as any)
    .update({
      current_lat: lat,
      current_lng: lng,
      last_location_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
