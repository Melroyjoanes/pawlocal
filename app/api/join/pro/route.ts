import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/join/pro
// Called by a pet PARENT (not a provider) to connect themselves to a verified provider.
// Creates a provider_clients row so the provider can send them walk reports.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first to connect.' }, { status: 401 })

  const body = await req.json()
  const { provider_id, pet_name, owner_name, owner_whatsapp } = body

  if (!provider_id?.trim()) return NextResponse.json({ error: 'provider_id is required' }, { status: 400 })
  if (!pet_name?.trim()) return NextResponse.json({ error: "Dog's name is required." }, { status: 400 })
  if (!owner_whatsapp?.trim()) return NextResponse.json({ error: 'WhatsApp number is required.' }, { status: 400 })

  // Validate provider exists and is approved
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id, name')
    .eq('id', provider_id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!provider) return NextResponse.json({ error: 'Provider not found.' }, { status: 404 })

  // Normalise WhatsApp number
  let wa = String(owner_whatsapp).replace(/[\s\-\(\)]/g, '')
  if (/^\d{10}$/.test(wa)) wa = '91' + wa

  // Check for duplicate connection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin().from('provider_clients') as any)
    .select('id')
    .eq('provider_id', provider_id)
    .eq('owner_user_id', user.id)
    .eq('pet_name', pet_name.trim())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You are already connected to this provider for this dog.' }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client, error } = await (admin().from('provider_clients') as any)
    .insert({
      provider_id,
      pet_name: pet_name.trim(),
      owner_name: owner_name?.trim() || null,
      owner_whatsapp: wa,
      owner_user_id: user.id,
      invite_status: 'accepted',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, client_id: client.id })
}
