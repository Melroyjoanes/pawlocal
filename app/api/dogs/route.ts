import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/dogs — returns authenticated user's dogs
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (admin().from('dogs') as any)
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/dogs — create a new dog
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, breed, dob, health_notes, photo_url, walk_time_bucket } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const insertPayload: Record<string, unknown> = {
    owner_id: user.id,
    name,
    breed: breed ?? null,
    dob: dob ?? null,
    health_notes: health_notes ?? null,
    photo_url: photo_url ?? null,
  }
  if (walk_time_bucket) insertPayload.walk_time_bucket = walk_time_bucket

  let { data, error } = await (admin().from('dogs') as any)
    .insert(insertPayload)
    .select()
    .single()

  // walk_time_bucket is a nullable column added in migration 053 — until that
  // migration is run manually against prod, the column won't exist yet. Retry
  // without it rather than failing dog creation entirely.
  if (error && 'walk_time_bucket' in insertPayload && /walk_time_bucket/i.test(error.message ?? '')) {
    delete insertPayload.walk_time_bucket
    ;({ data, error } = await (admin().from('dogs') as any)
      .insert(insertPayload)
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Start trial on first dog creation if not already started
  ;(async () => {
    try {
      const { data: profile } = await (admin().from('profiles') as any)
        .select('trial_started_at')
        .eq('id', user.id)
        .single()
      if (profile && profile.trial_started_at === null) {
        await (admin().from('profiles') as any)
          .update({ trial_started_at: new Date().toISOString() })
          .eq('id', user.id)
      }
    } catch { /* non-critical */ }
  })()

  return NextResponse.json(data, { status: 201 })
}
