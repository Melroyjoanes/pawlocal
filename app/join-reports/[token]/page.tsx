import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import JoinReportsClient from './JoinReportsClient'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export default async function JoinReportsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clientRow } = await (admin().from('provider_clients') as any)
    .select('id, pet_name, owner_name, owner_whatsapp, linked_at, provider_id')
    .eq('invite_token', token)
    .single()

  if (!clientRow) redirect('/')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('name')
    .eq('id', clientRow.provider_id)
    .single()

  // If already linked, check if logged-in user is the same
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If already linked by this user — redirect to their dashboard
  if (clientRow.linked_at && user && clientRow.owner_user_id === user.id) {
    redirect('/my-reports')
  }

  return (
    <JoinReportsClient
      inviteToken={token}
      clientId={clientRow.id}
      petName={clientRow.pet_name}
      ownerName={clientRow.owner_name}
      providerName={provider?.name ?? 'Your caretaker'}
      alreadyLinked={!!clientRow.linked_at}
      isLoggedIn={!!user}
    />
  )
}
