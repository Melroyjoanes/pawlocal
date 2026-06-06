import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getProvider(userEmail: string) {
  const db = admin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db.from('providers') as any)
    .select('id')
    .eq('email', userEmail)
    .eq('status', 'approved')
    .single()
  return data as { id: string } | null
}

// GET — list bookings for this provider
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getProvider(user.email!)
  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = admin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from('provider_bookings') as any)
    .select('*')
    .eq('provider_id', provider.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — create a new booking
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getProvider(user.email!)
  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    date, service, owner_name, pet_name,
    duration_min, amount_inr, notes,
  } = body

  if (!date || !service) {
    return NextResponse.json({ error: 'date and service are required' }, { status: 400 })
  }

  const db = admin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from('provider_bookings') as any)
    .insert({
      provider_id: provider.id,
      date,
      service,
      owner_name: owner_name?.trim() ?? '',
      pet_name: pet_name?.trim() ?? '',
      duration_min: parseInt(duration_min, 10) || 0,
      amount_inr: parseFloat(amount_inr) || 0,
      notes: notes?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
