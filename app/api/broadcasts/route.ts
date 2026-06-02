import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const {
    service_slug, pet_description, area,
    date_needed, budget, poster_name, poster_whatsapp, notes,
  } = await req.json()

  if (!service_slug || !pet_description || !area || !date_needed || !poster_name || !poster_whatsapp) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Basic WhatsApp validation — must be 10+ digits
  const digits = poster_whatsapp.replace(/\D/g, '')
  if (digits.length < 10) {
    return NextResponse.json({ error: 'Invalid WhatsApp number' }, { status: 400 })
  }

  const { data, error } = await supabase.from('broadcasts').insert({
    service_slug,
    pet_description: pet_description.trim(),
    area: area.trim(),
    date_needed: date_needed.trim(),
    budget: budget?.trim() || null,
    poster_name: poster_name.trim(),
    poster_whatsapp: digits,
    notes: notes?.trim() || null,
  } as never)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
