'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WalkEvent } from '@/lib/supabase/types'

interface Props {
  sessionId: string
  shareToken: string
  petName: string | null
  providerName: string
  initialStatus: 'active' | 'completed'
  initialLat: number | null
  initialLng: number | null
  startedAt: string
  endedAt: string | null
  walkEvents: WalkEvent[]
}

function elapsed(fromIso: string): string {
  const secs = Math.floor((Date.now() - new Date(fromIso).getTime()) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function TrackingClient({
  sessionId,
  petName,
  providerName,
  initialStatus,
  initialLat,
  initialLng,
  startedAt,
  endedAt,
  walkEvents: initialEvents,
}: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [lat, setLat] = useState<number | null>(initialLat)
  const [lng, setLng] = useState<number | null>(initialLng)
  const [events, setEvents] = useState<WalkEvent[]>(initialEvents)
  const [timer, setTimer] = useState('')
  const mapRef = useRef<HTMLIFrameElement>(null)

  // Live timer
  useEffect(() => {
    if (status !== 'active') return
    const interval = setInterval(() => {
      setTimer(elapsed(startedAt))
    }, 1000)
    setTimer(elapsed(startedAt))
    return () => clearInterval(interval)
  }, [status, startedAt])

  // Supabase Realtime — subscribe to walk_sessions changes
  useEffect(() => {
    if (status === 'completed') return

    const supabase = createClient()
    const channel = supabase
      .channel(`walk_session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'walk_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            current_lat: number | null
            current_lng: number | null
            status: 'active' | 'completed'
            walk_events: WalkEvent[]
          }
          if (row.current_lat !== null) setLat(row.current_lat)
          if (row.current_lng !== null) setLng(row.current_lng)
          if (row.status) setStatus(row.status)
          if (Array.isArray(row.walk_events)) setEvents(row.walk_events)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, status])

  const mapsUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`
    : null

  const peeCount = events.filter(e => e.type === 'pee').length
  const poopCount = events.filter(e => e.type === 'poop').length

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <img src="/logo.webp" alt="PupStep" className="h-10 w-auto" />
            <span className="font-display font-semibold text-stone-600 text-sm">Walk Tracker</span>
          </div>
          <p className="text-sm text-stone-500">
            {petName ? `${petName}'s walk` : 'Live walk'} with {providerName}
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 space-y-4">

        {/* Status card */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: status === 'active'
              ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)'
              : 'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
            border: status === 'active' ? '1.5px solid #6EE7B7' : '1.5px solid #CBD5E1',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            {status === 'active' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Live · Walking now</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Walk completed</span>
              </>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-display text-2xl font-bold text-stone-900">
                {status === 'active' ? timer : (endedAt ? `${Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)}m` : '—')}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">Duration</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-stone-900">
                💧{peeCount}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">Pee stops</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-stone-900">
                💩{poopCount}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">Poop stops</p>
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-3 text-center">
            Started at {formatTime(startedAt)}
            {endedAt && ` · Ended at ${formatTime(endedAt)}`}
          </p>
        </div>

        {/* Map */}
        <div className="rounded-2xl overflow-hidden bg-white border border-stone-200" style={{ height: 360 }}>
          {mapsUrl ? (
            <iframe
              ref={mapRef}
              key={`${lat},${lng}`}
              src={mapsUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Walk location"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-stone-400">
              <div className="text-5xl mb-3">📍</div>
              <p className="text-sm font-medium">Waiting for location…</p>
              <p className="text-xs text-stone-300 mt-1">The walker's position will appear here</p>
            </div>
          )}
        </div>

        {/* Events timeline */}
        {events.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Walk log</p>
            <div className="space-y-2">
              {events.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-xl">{ev.type === 'pee' ? '💧' : '💩'}</span>
                  <span className="text-stone-600 capitalize">{ev.type}</span>
                  <span className="text-stone-400 text-xs ml-auto">{formatTime(ev.ts)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-stone-400 text-center pb-4">
          Location updates every 10 seconds · Powered by PupStep
        </p>

      </main>
    </div>
  )
}
