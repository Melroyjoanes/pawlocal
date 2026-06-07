import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/walk-reports — provider fetches their own reports list (auth required)
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find provider by email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id')
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin().from('walk_reports') as any)
    .select('*')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

// POST /api/walk-reports — create a new walk report (auth required)
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find provider by email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id')
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  const body = await req.json()
  const { dog_name, duration_mins, poop_count, pee_count, notes, photo_url, walk_date } = body

  if (!dog_name || duration_mins == null) {
    return NextResponse.json({ error: 'Missing required fields: dog_name, duration_mins' }, { status: 400 })
  }

  // Generate 32-char hex share token
  const token = require('crypto').randomBytes(16).toString('hex')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin().from('walk_reports') as any)
    .insert({
      provider_id: provider.id,
      token,
      dog_name: dog_name.trim(),
      duration_mins: Number(duration_mins),
      poop_count: Number(poop_count ?? 0),
      pee_count: Number(pee_count ?? 0),
      notes: notes?.trim() || null,
      photo_url: photo_url || null,
      walk_date: walk_date ?? new Date().toISOString(),
    })
    .select('id, token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, token: data.token, id: data.id })
}
