import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin().from('provider_clients') as any)
    .select('id, pet_name, invite_token, invite_status, invite_expires_at, linked_at, provider_id, owner_name')
    .eq('owner_user_id', user.id)
    .neq('invite_status', 'revoked')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const withProviders = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data ?? []).map(async (row: any) => {
      if (row.provider_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: provider } = await (admin().from('providers') as any)
          .select('name, category_slug')
          .eq('id', row.provider_id)
          .maybeSingle()
        return { ...row, provider_name: provider?.name ?? null, provider_category: provider?.category_slug ?? null }
      }
      return { ...row, provider_name: null, provider_category: null }
    })
  )

  return NextResponse.json(withProviders)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const pet_name = body.pet_name?.trim()
  const role = body.role ?? 'walker'

  if (!pet_name) return NextResponse.json({ error: 'Pet name is required' }, { status: 400 })

  const owner_name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Your dog owner'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite, error } = await (admin().from('provider_clients') as any)
    .insert({
      owner_user_id: user.id,
      owner_name,
      pet_name,
      invite_status: 'pending',
      invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, invite_token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'
  const inviteUrl = `${siteUrl}/join-as-provider/${invite.invite_token}`

  const roleLabel = role === 'groomer' ? 'grooming session' : role === 'caretaker' ? 'session' : 'walk'
  const waText = encodeURIComponent(
    `${owner_name} ne aapko PupStep pe invite kiya hai 🐕\n\n${pet_name} ke liye har ${roleLabel} ke baad report bhejne ke liye yeh link click karo — sirf 1 minute lagega:\n\n👉 ${inviteUrl}`
  )

  await admin().from('analytics_events').insert({
    event_type: 'invite_sent',
    user_id: user.id,
    user_email: user.email ?? null,
    user_name: owner_name,
    invite_token: invite.invite_token,
    metadata: { pet_name, role },
  })

  return NextResponse.json({
    invite_token: invite.invite_token,
    invite_url: inviteUrl,
    whatsapp_link: `https://wa.me/?text=${waText}`,
  })
}
