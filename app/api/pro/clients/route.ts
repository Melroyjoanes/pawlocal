import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getProvider(userEmail: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin().from('providers') as any)
    .select('id, name')
    .eq('email', userEmail)
    .single()
  return data as { id: string; name: string } | null
}

// GET /api/pro/clients — list all clients for the logged-in provider
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getProvider(user.email!)
  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin().from('provider_clients') as any)
    .select('id, pet_name, owner_name, owner_whatsapp, owner_user_id, linked_at, invite_token, invite_status, created_at')
    .eq('provider_id', provider.id)
    .neq('invite_status', 'revoked')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/pro/clients — add a new client
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getProvider(user.email!)
  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  const body = await req.json()
  const { pet_name, owner_name, owner_whatsapp } = body

  if (!pet_name?.trim() || !owner_whatsapp?.trim()) {
    return NextResponse.json({ error: 'pet_name and owner_whatsapp are required' }, { status: 400 })
  }

  // Normalise WhatsApp number — strip spaces/dashes, add 91 if 10-digit Indian
  let wa = owner_whatsapp.replace(/[\s\-\(\)]/g, '')
  if (/^\d{10}$/.test(wa)) wa = '91' + wa

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin().from('provider_clients') as any)
    .select('id')
    .eq('provider_id', provider.id)
    .eq('owner_whatsapp', wa)
    .eq('pet_name', pet_name.trim())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'This client is already added' }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client, error } = await (admin().from('provider_clients') as any)
    .insert({
      provider_id: provider.id,
      pet_name: pet_name.trim(),
      owner_name: owner_name?.trim() || null,
      owner_whatsapp: wa,
    })
    .select('id, pet_name, owner_name, owner_whatsapp, invite_token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build invite link
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'
  const inviteLink = `${siteUrl}/join-reports/${client.invite_token}`
  const providerFirstName = provider.name.split(' ')[0]

  // Send WhatsApp message to the pet parent
  const waMessage = encodeURIComponent(
    `Hi! I'm ${providerFirstName}, ${client.pet_name}'s caretaker on PupStep. 🐾\n\nI'll now send you a report after every session — tap below to save all reports to your account:\n${inviteLink}`
  )
  const waLink = `https://wa.me/${wa}?text=${waMessage}`

  return NextResponse.json({ ok: true, client, whatsapp_link: waLink })
}
