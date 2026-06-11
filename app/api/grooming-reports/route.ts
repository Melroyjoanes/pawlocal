import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('id, name')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single()
  if (!provider) return NextResponse.json({ error: 'Not an approved provider' }, { status: 403 })

  const body = await req.json()
  const {
    dog_name, grooming_date, duration_mins,
    services_done, ticks_found, tick_locations,
    skin_condition, ear_condition, nail_condition, coat_condition,
    behavior, before_photo_url, after_photo_url, notes, recommendations,
  } = body

  if (!dog_name?.trim()) {
    return NextResponse.json({ error: 'Dog name is required' }, { status: 400 })
  }

  const token = crypto.randomUUID().replace(/-/g, '')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('grooming_reports') as any)
    .insert({
      token,
      provider_id:     provider.id,
      dog_name:        dog_name.trim(),
      grooming_date:   grooming_date ?? new Date().toISOString(),
      duration_mins:   duration_mins ?? 60,
      services_done:   services_done ?? [],
      ticks_found:     ticks_found ?? 0,
      tick_locations:  tick_locations ?? [],
      skin_condition:  skin_condition ?? 'normal',
      ear_condition:   ear_condition ?? 'clean',
      nail_condition:  nail_condition ?? 'healthy',
      coat_condition:  coat_condition ?? 'shiny',
      behavior:        behavior ?? 'calm',
      before_photo_url: before_photo_url ?? null,
      after_photo_url:  after_photo_url ?? null,
      notes:           notes?.trim() ?? null,
      recommendations: recommendations?.trim() ?? null,
    })
    .select('id, token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, token: data.token })
}
