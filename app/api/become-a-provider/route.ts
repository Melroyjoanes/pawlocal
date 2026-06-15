import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Juhu, Mumbai — sensible default for walkers coming via invite
const DEFAULT_LAT = 19.1057
const DEFAULT_LNG = 72.827
const DEFAULT_ADDRESS = 'Juhu, Mumbai'

export async function POST(req: NextRequest) {
  // Auth check
  const serverClient = await createServerClient()
  const {
    data: { user },
  } = await serverClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, whatsapp, role, invite_token } = body as {
    name?: string
    whatsapp?: string
    role?: string
    invite_token?: string
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const cleanWA = (whatsapp ?? '').replace(/\D/g, '')
  if (cleanWA.length !== 10) {
    return NextResponse.json({ error: 'Valid 10-digit WhatsApp number required' }, { status: 400 })
  }
  if (!role) {
    return NextResponse.json({ error: 'Role is required' }, { status: 400 })
  }

  const db = admin()

  // Check if provider record already exists for this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db.from('providers') as any)
    .select('id, status')
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ''}`)
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Already a provider — just ensure linking can proceed
    // Update role in profiles in case it's missing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.from('profiles') as any)
      .update({ role: 'provider' })
      .eq('id', user.id)

    return NextResponse.json({ ok: true, provider_id: existing.id })
  }

  // Insert new provider row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newProvider, error: insertError } = await (db.from('providers') as any)
    .insert({
      name: name.trim(),
      whatsapp: cleanWA,
      category_slug: role,
      category_slugs: [role],
      user_id: user.id,
      email: user.email ?? null,
      status: 'approved',
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
      address: DEFAULT_ADDRESS,
      // Surface as verified via invite — no manual admin review needed
      metadata: {
        onboarded_via: 'invite_link',
        invite_token: invite_token ?? null,
      },
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[become-a-provider] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create provider profile' }, { status: 500 })
  }

  // Update profiles.role to 'provider'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (db.from('profiles') as any)
    .update({ role: 'provider' })
    .eq('id', user.id)

  if (profileError) {
    // Non-fatal — log but don't fail the response
    console.error('[become-a-provider] profile update error:', profileError)
  }

  return NextResponse.json({ ok: true, provider_id: newProvider?.id ?? null })
}
