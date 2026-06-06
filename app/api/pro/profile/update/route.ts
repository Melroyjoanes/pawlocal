import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()

  // Get session user from cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin client for DB writes
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify caller is an approved provider identified by their session email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('id')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    name, business_name, whatsapp, phone, bio,
    price_min, price_max, price_unit,
    hours_from, hours_to, working_days, is_emergency,
    photo_url,
  } = body

  if (!name || !whatsapp) {
    return NextResponse.json({ error: 'Name and WhatsApp are required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('providers') as any)
    .update({
      name,
      business_name: business_name ?? null,
      whatsapp,
      phone: phone ?? null,
      bio: bio ?? null,
      price_min: price_min != null ? Number(price_min) : null,
      price_max: price_max != null ? Number(price_max) : null,
      price_unit: price_unit ?? 'per session',
      hours_from: hours_from ?? '09:00',
      hours_to: hours_to ?? '18:00',
      working_days: working_days ?? [],
      is_emergency: is_emergency ?? false,
    })
    .eq('id', provider.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If a new photo URL was provided, upsert it as the primary photo
  if (photo_url && typeof photo_url === 'string' && photo_url.startsWith('http')) {
    // Remove old primary flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('provider_photos') as any)
      .update({ is_primary: false })
      .eq('provider_id', provider.id)

    // Check if this URL already exists in provider_photos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (admin.from('provider_photos') as any)
      .select('id')
      .eq('provider_id', provider.id)
      .eq('url', photo_url)
      .maybeSingle()

    if (existing) {
      // Mark it as primary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('provider_photos') as any)
        .update({ is_primary: true })
        .eq('id', existing.id)
    } else {
      // Insert new primary photo
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('provider_photos') as any)
        .insert({ provider_id: provider.id, url: photo_url, is_primary: true, sort_order: 0 })
    }
  }

  return NextResponse.json({ success: true })
}
