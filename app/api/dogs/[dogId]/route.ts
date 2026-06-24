import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// PATCH /api/dogs/[dogId] — update a dog owned by the authenticated user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dogId: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dogId } = await params

  let body: {
    name?: string
    breed?: string | null
    care_focus?: string | null
    health_notes?: string | null
    walking_instructions?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin().from('dogs') as any)
    .select('id')
    .eq('id', dogId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Dog not found' }, { status: 404 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
  if ('breed' in body)               update.breed               = body.breed ?? null
  if ('care_focus' in body)          update.care_focus          = body.care_focus ?? null
  if ('health_notes' in body)        update.health_notes        = body.health_notes ?? null
  if ('walking_instructions' in body) update.walking_instructions = body.walking_instructions ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin().from('dogs') as any)
    .update(update)
    .eq('id', dogId)
    .eq('owner_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
