import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin().from('provider_clients') as any)
    .select('id, pet_name, owner_name, invite_status, invite_expires_at, linked_at, provider_id')
    .eq('invite_token', token)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  return NextResponse.json({
    pet_name: data.pet_name,
    owner_first_name: data.owner_name?.split(' ')[0] ?? 'Your client',
    invite_status: data.invite_status,
    expires_at: data.invite_expires_at,
    already_accepted: data.invite_status === 'accepted',
    is_expired: new Date(data.invite_expires_at) < new Date(),
  })
}
