import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST — create a new live walk session, returns share_token
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id').eq('email', user.email).eq('status', 'approved').maybeSingle()
  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const shareToken = require('crypto').randomBytes(12).toString('hex')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin().from('walk_sessions') as any)
    .insert({
      provider_id: provider.id,
      share_token: shareToken,
      pet_name: body.pet_name ?? null,
      status: 'active',
      started_at: new Date().toISOString(),
      walk_events: [],
    })
    .select('id, share_token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, share_token: data.share_token })
}

// PATCH — update current position and events
export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { session_id, current_lat, current_lng, walk_events, status, ended_at } = body
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (current_lat !== undefined) update.current_lat = current_lat
  if (current_lng !== undefined) update.current_lng = current_lng
  if (walk_events !== undefined) update.walk_events = walk_events
  if (status !== undefined) update.status = status
  if (ended_at !== undefined) update.ended_at = ended_at

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin().from('walk_sessions') as any)
    .update(update)
    .eq('id', session_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
