import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}

export async function GET() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 200 })

  const { data, error } = await supabase
    .from('saved_providers')
    .select('id, provider_id, providers(id, name, category_slug, whatsapp)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json([], { status: 200 })

  // Flatten: return array of { saved_id, id, name, category_slug, whatsapp }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (data ?? []).map((row: any) => ({
    saved_id: row.id,
    id: row.providers?.id,
    name: row.providers?.name,
    category_slug: row.providers?.category_slug,
    whatsapp: row.providers?.whatsapp,
  })).filter((r: { id?: string }) => r.id)

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider_id } = await req.json()
  if (!provider_id) return NextResponse.json({ error: 'provider_id required' }, { status: 400 })

  // Upsert (ignore duplicate)
  const { error } = await supabase
    .from('saved_providers')
    .upsert({ user_id: user.id, provider_id }, { onConflict: 'user_id,provider_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
