import { notFound } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import TrackingClient from './TrackingClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function TrackPage({ params }: Props) {
  const { token } = await params

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session } = await (admin.from('walk_sessions') as any)
    .select('id, share_token, pet_name, status, current_lat, current_lng, started_at, ended_at, walk_events')
    .eq('share_token', token)
    .single()

  if (!session) notFound()

  // Fetch provider name separately for display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: walkWithProvider } = await (admin.from('walk_sessions') as any)
    .select('provider_id, providers(name)')
    .eq('share_token', token)
    .single()

  const providerName: string = (walkWithProvider?.providers as { name: string } | null)?.name ?? 'Your walker'

  return (
    <TrackingClient
      sessionId={session.id}
      shareToken={token}
      petName={session.pet_name}
      providerName={providerName}
      initialStatus={session.status}
      initialLat={session.current_lat}
      initialLng={session.current_lng}
      startedAt={session.started_at}
      endedAt={session.ended_at}
      walkEvents={session.walk_events ?? []}
    />
  )
}
