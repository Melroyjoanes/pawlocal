import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite, error: inviteError } = await (admin().from('provider_clients') as any)
    .select('id, invite_status, invite_expires_at, owner_user_id, pet_name')
    .eq('invite_token', token)
    .maybeSingle()

  if (inviteError || !invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (invite.invite_status === 'revoked') return NextResponse.json({ error: 'This invite has been revoked' }, { status: 410 })
  if (new Date(invite.invite_expires_at) < new Date() && invite.invite_status === 'pending') {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }
  if (invite.invite_status === 'accepted') return NextResponse.json({ ok: true, already_linked: true })
  if (invite.owner_user_id === user.id) return NextResponse.json({ error: 'Cannot accept your own invite' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!provider) {
    return NextResponse.json({ error: 'No provider profile', needs_onboarding: true }, { status: 422 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (admin().from('provider_clients') as any)
    .update({
      provider_id: provider.id,
      invite_status: 'accepted',
      linked_at: new Date().toISOString(),
    })
    .eq('invite_token', token)
    .eq('invite_status', 'pending')

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  try {
    await admin().from('analytics_events').insert({
      event_type: 'invite_accepted',
      user_id: user.id,
      user_email: user.email ?? null,
      user_name: user.user_metadata?.full_name ?? null,
      invite_token: token,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
      metadata: { pet_name: invite.pet_name, provider_id: provider.id },
    })
  } catch { /* analytics never blocks */ }

  return NextResponse.json({ ok: true, pet_name: invite.pet_name })
}
