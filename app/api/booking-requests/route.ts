import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('booking_requests')
    .select('*, providers(name, category_slug)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to send a request' }, { status: 401 })

  const body = await req.json()
  const { provider_id, service_slug, pet_name, pet_type, date_needed, time_needed, notes } = body

  if (!provider_id || !service_slug || !date_needed) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Use admin client for the INSERT — the anon client's SELECT policies reference
  // auth.users directly (booking_provider_select), causing "permission denied for
  // table users" when .select() is chained after .insert().
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('booking_requests') as any)
    .insert({
      provider_id,
      customer_id: user.id,
      service_slug,
      pet_name: pet_name ?? '',
      pet_type: pet_type ?? '',
      date_needed,
      time_needed: time_needed ?? '',
      notes: notes ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch provider — number never sent to client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('whatsapp, name')
    .eq('id', provider_id)
    .eq('status', 'approved')
    .single()

  if (!provider?.whatsapp) {
    return NextResponse.json({ error: 'Provider not found or has no WhatsApp' }, { status: 404 })
  }

  // Build WhatsApp message — URL constructed server-side, number never exposed
  const serviceName = service_slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase())

  const petLine = pet_name ? `${pet_name} (${pet_type})` : `(${pet_type})`
  const refCode = `#PL-${(data.id as string).replace(/-/g, '').slice(0, 6).toUpperCase()}`

  const lines = [
    `Hi ${provider.name}! I found you on PawLocal 🐾`,
    ``,
    `📋 *Service Request*`,
    `Service: ${serviceName}`,
    `Pet: ${petLine}`,
    `Date: ${date_needed}`,
    `Time: ${time_needed}`,
    notes ? `Notes: ${notes}` : null,
    ``,
    `Ref: ${refCode}`,
  ].filter((l): l is string => l !== null).join('\n')

  const digits = (provider.whatsapp as string).replace(/\D/g, '').slice(-10)
  const whatsapp_url = `https://wa.me/91${digits}?text=${encodeURIComponent(lines)}`

  // Track whatsapp_click analytics — this is the activation event
  // Fire-and-forget, don't block the response
  void admin
    .from('provider_analytics')
    .insert({ provider_id, event_type: 'whatsapp_click' })

  return NextResponse.json({ booking_id: data.id, whatsapp_url })
}
