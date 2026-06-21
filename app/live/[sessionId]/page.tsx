import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import LiveMapClient from './LiveMapClient'

export const metadata: Metadata = {
  title: "Live Walk — PupStep",
}

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default async function LiveWalkPage({ params }: PageProps) {
  const { sessionId } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error } = await (supabase as any)
    .from('walk_sessions')
    .select('id, pet_name, customer_name, status, started_at, ended_at, distance_km, current_lat, current_lng')
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: '#FFFBEB' }}
      >
        <span className="text-5xl">🐾</span>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}
        >
          Walk not found or expired
        </h1>
        <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-nunito)' }}>
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

  return (
    <LiveMapClient
      sessionId={sessionId}
      session={{
        id: session.id,
        pet_name: session.pet_name ?? null,
        customer_name: session.customer_name ?? null,
        status: session.status === 'completed' ? 'completed' : 'active',
        started_at: session.started_at,
        ended_at: session.ended_at ?? null,
        distance_km: session.distance_km ?? null,
        current_lat: session.current_lat ?? null,
        current_lng: session.current_lng ?? null,
      }}
    />
  )
}
