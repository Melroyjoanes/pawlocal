import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import JoinAsProviderClient from './JoinAsProviderClient'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function detectHindi(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false
  const langs = acceptLanguage.toLowerCase().split(',').map(l => l.split(';')[0].trim())
  return langs.some(l => l === 'hi' || l.startsWith('hi-'))
}

export default async function JoinAsProviderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ expired?: string }>
}) {
  const { token } = await params
  const { expired } = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite } = await (admin().from('provider_clients') as any)
    .select('id, pet_name, owner_name, invite_status, invite_expires_at, provider_id')
    .eq('invite_token', token)
    .maybeSingle()

  if (!invite) redirect('/')

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language')
  const defaultHindi = detectHindi(acceptLanguage)

  const isExpired = expired === '1' || new Date(invite.invite_expires_at) < new Date()
  const isAlreadyAccepted = invite.invite_status === 'accepted'
  const isRevoked = invite.invite_status === 'revoked'

  return (
    <JoinAsProviderClient
      inviteToken={token}
      petName={invite.pet_name}
      ownerFirstName={invite.owner_name?.split(' ')[0] ?? 'Your client'}
      isExpired={isExpired}
      isAlreadyAccepted={isAlreadyAccepted}
      isRevoked={isRevoked}
      defaultHindi={defaultHindi}
    />
  )
}
