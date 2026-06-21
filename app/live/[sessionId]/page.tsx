import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import LiveMapClient from './LiveMapClient'

export const metadata: Metadata = {
  title: "Bruno's Live Walk — PupStep",
}

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default async function LiveWalkPage({ params }: PageProps) {
  const { sessionId } = await params
  const supabase = await createClient()

  const { data: session, error } = await supabase
    .from('walk_sessions')
    .select('id, walker_name, dog_id, status, started_at, ended_at, distance_meters, dogs(name), last_location:walk_locations(lat, lng, recorded_at)')
    .eq('id', sessionId)
    .order('recorded_at', { referencedTable: 'walk_locations', ascending: false })
    .limit(1, { referencedTable: 'walk_locations' })
    .single()

  if (error || !session) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: '#FFFBEB' }}
      >
        <span className="text-5xl">🐾</span>
        <h1
          className="text-2xl font-heading font-bold"
          style={{ color: '#0A2F35' }}
        >
          Walk not found or expired
        </h1>
        <p className="text-sm font-sans" style={{ color: '#6B7280' }}>
          This walk link may have expired or the session doesn&apos;t exist.
        </p>
        <a
          href="/"
          className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold text-white"
          style={{ background: '#FF8C52' }}
        >
          Go to PupStep
        </a>
      </div>
    )
  }

  const lastLocationArr = session.last_location as Array<{ lat: number; lng: number; recorded_at: string }> | null
  const lastLocation = lastLocationArr && lastLocationArr.length > 0 ? lastLocationArr[0] : null
  const dogName = (session.dogs as { name: string } | null)?.name ?? null
  const distanceKm = session.distance_meters ? session.distance_meters / 1000 : null

  return (
    <LiveMapClient
      sessionId={sessionId}
      session={{
        id: session.id,
        pet_name: dogName,
        customer_name: session.walker_name,
        status: session.status === 'ended' ? 'completed' : 'active',
        started_at: session.started_at,
        ended_at: session.ended_at ?? null,
        distance_km: distanceKm,
        current_lat: lastLocation?.lat ?? null,
        current_lng: lastLocation?.lng ?? null,
      }}
    />
  )
}
