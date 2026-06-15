import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function resolveBase(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) return `https://${forwardedHost}`
  if (process.env.NODE_ENV === 'development') return new URL(request.url).origin
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const base = resolveBase(request)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${base}/join-as-provider/${token}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite } = await (admin().from('provider_clients') as any)
    .select('id, invite_status, invite_expires_at, owner_user_id, pet_name')
    .eq('invite_token', token)
    .maybeSingle()

  if (!invite) return NextResponse.redirect(`${base}/?invite_error=not_found`)
  if (invite.invite_status === 'revoked') return NextResponse.redirect(`${base}/?invite_error=revoked`)
  if (invite.owner_user_id === user.id) return NextResponse.redirect(`${base}/my-reports?invite_error=own_invite`)

  if (invite.invite_status === 'accepted') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: provider } = await (admin().from('providers') as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (provider) return NextResponse.redirect(`${base}/pro/dashboard?linked=1`)
    return NextResponse.redirect(`${base}/become-a-provider?invite_token=${token}`)
  }

  if (new Date(invite.invite_expires_at) < new Date()) {
    return NextResponse.redirect(`${base}/join-as-provider/${token}?expired=1`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!provider) {
    return NextResponse.redirect(`${base}/become-a-provider?invite_token=${token}`)
  }

  // Atomically link provider to the invite
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin().from('provider_clients') as any)
    .update({
      provider_id: provider.id,
      invite_status: 'accepted',
      linked_at: new Date().toISOString(),
    })
    .eq('invite_token', token)
    .eq('invite_status', 'pending')

  try {
    await admin().from('analytics_events').insert({
      event_type: 'invite_accepted',
      user_id: user.id,
      user_email: user.email ?? null,
      user_name: user.user_metadata?.full_name ?? null,
      invite_token: token,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: request.headers.get('user-agent') ?? null,
      metadata: { pet_name: invite.pet_name, provider_id: provider.id },
    })
  } catch { /* never block */ }

  return NextResponse.redirect(`${base}/pro/dashboard?linked=1&pet=${encodeURIComponent(invite.pet_name)}`)
}
