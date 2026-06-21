'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WalkerConnection {
  id: string
  token: string
  dog_id: string | null
  dog_name: string
  dog_breed: string | null
  dog_photo: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_user_id: string | null
  walker_name: string | null
}

interface ActiveWalk {
  sessionId: string
  connectionId: string
  dogName: string
  startedAt: Date
  elapsed: number
  distanceKm: number
  gpsError: string | null
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const SPRING = { type: 'spring', stiffness: 420, damping: 36 } as const
const EASE_OUT = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } as const

export default function StartWalkPanel({ walkerName, walkerPhone }: { walkerName: string; walkerPhone?: string | null }) {
  const [connections, setConnections] = useState<WalkerConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null)
  const [activeWalk, setActiveWalk] = useState<ActiveWalk | null>(null)
  const [ending, setEnding] = useState(false)
  const [locationWarning, setLocationWarning] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const activeWalkRef = useRef<ActiveWalk | null>(null)
  activeWalkRef.current = activeWalk

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setLocationWarning('Location tracking requires HTTPS.')
    }
  }, [])

  const fetchConnections = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pro/my-connections')
      if (res.ok) {
        const data = await res.json()
        setConnections(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  async function handleStartWalk(conn: WalkerConnection) {
    if (activeWalk) return
    setStartingId(conn.id)
    setGpsStatusMsg('Getting your location…')

    if (!navigator.geolocation) {
      setGpsStatusMsg('GPS not available on this device.')
      setStartingId(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsStatusMsg('Starting walk…')

        const res = await fetch('/api/walks/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walker_connection_id: conn.id,
            dog_id: conn.dog_id,
            walker_name: walkerName,
            walker_phone: walkerPhone ?? '',
            parent_user_id: conn.parent_user_id,
            parent_phone: conn.parent_phone ?? '',
          }),
        })

        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setGpsStatusMsg(d.error ?? 'Failed to start walk. Try again.')
          setStartingId(null)
          return
        }

        const { session_id, wa_link } = await res.json()
        const sessionId: string = session_id

        // Open WhatsApp to notify parent
        if (wa_link) {
          window.open(wa_link, '_blank')
        }

        // Seed first point
        lastPointRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }

        const walk: ActiveWalk = {
          sessionId,
          connectionId: conn.id,
          dogName: conn.dog_name,
          startedAt: new Date(),
          elapsed: 0,
          distanceKm: 0,
          gpsError: null,
        }
        setActiveWalk(walk)
        setStartingId(null)
        setGpsStatusMsg(null)

        // Timer
        timerRef.current = setInterval(() => {
          setActiveWalk((prev) => prev ? { ...prev, elapsed: prev.elapsed + 1 } : prev)
        }, 1000)

        // GPS watch
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const newPt = { lat: p.coords.latitude, lng: p.coords.longitude }
            const last = lastPointRef.current
            if (last) {
              const delta = haversineKm(last.lat, last.lng, newPt.lat, newPt.lng)
              setActiveWalk((prev) => prev ? { ...prev, distanceKm: +(prev.distanceKm + delta).toFixed(3) } : prev)
            }
            lastPointRef.current = newPt
          },
          (err) => {
            if (err.code === 1) {
              setActiveWalk((prev) => prev ? { ...prev, gpsError: 'Location permission denied. Please enable location access in your browser settings.' } : prev)
            }
          },
          GEO_OPTIONS
        )

        // RAF-based GPS push every 15s
        let lastSentAt = Date.now()
        function scheduleLocationPush() {
          rafRef.current = requestAnimationFrame(() => {
            const now = Date.now()
            if (now - lastSentAt >= 15000) {
              lastSentAt = now
              const pt = lastPointRef.current
              if (pt) {
                fetch(`/api/walks/${sessionId}/location`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ lat: pt.lat, lng: pt.lng }),
                }).catch(() => {})
              }
            }
            if (activeWalkRef.current?.sessionId === sessionId) {
              scheduleLocationPush()
            }
          })
        }
        scheduleLocationPush()
      },
      (err) => {
        if (err.code === 1) {
          setGpsStatusMsg('Location permission denied. Please enable location access in your browser settings.')
        } else {
          setGpsStatusMsg('Could not get your location. Please try again.')
        }
        setStartingId(null)
      },
      GEO_OPTIONS
    )
  }

  async function handleEndWalk() {
    if (!activeWalk || ending) return
    setEnding(true)

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null }
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }

    await fetch(`/api/walks/${activeWalk.sessionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distance_meters: activeWalk.distanceKm > 0 ? Math.round(activeWalk.distanceKm * 1000) : 0 }),
    }).catch(() => {})

    setActiveWalk(null)
    setEnding(false)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">My Dogs</p>
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse h-20" />
        ))}
      </div>
    )
  }

  if (connections.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={EASE_OUT}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">My Dogs</p>

      {locationWarning && (
        <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700">
          ⚠️ {locationWarning}
        </div>
      )}

      {/* Active walk banner */}
      <AnimatePresence>
        {activeWalk && (
          <motion.div
            key="active-walk"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
            className="mb-4 rounded-2xl bg-[#0A2F35] text-white px-5 py-5 shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold text-green-300 uppercase tracking-widest">
                Walking {activeWalk.dogName}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-fredoka)' }}>
                  {formatElapsed(activeWalk.elapsed)}
                </p>
                <p className="text-xs text-slate-400 mt-1">elapsed</p>
              </div>
              <div>
                <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-fredoka)' }}>
                  {activeWalk.distanceKm.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400 mt-1">km tracked</p>
              </div>
            </div>
            {activeWalk.gpsError && (
              <p className="text-xs text-amber-300 mb-3">⚠️ {activeWalk.gpsError}</p>
            )}
            <button
              onClick={handleEndWalk}
              disabled={ending}
              className="w-full py-3.5 rounded-xl font-bold text-base text-[#0A2F35] bg-white disabled:opacity-60 active:scale-[0.98] transition-transform"
              style={{ fontFamily: 'var(--font-fredoka)' }}
            >
              {ending ? 'Ending…' : 'End Walk →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dog cards */}
      <div className="space-y-3">
        {connections.map((conn, i) => {
          const isWalkingThis = activeWalk?.connectionId === conn.id
          const isStarting = startingId === conn.id
          const blocked = !!activeWalk && !isWalkingThis

          const photoSrc = conn.dog_photo ??
            `https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=120&h=120&fit=crop&auto=format`

          return (
            <motion.div
              key={conn.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...EASE_OUT, delay: 0.05 + i * 0.04 }}
              className="bg-white rounded-2xl border border-border p-4 shadow-[0_4px_14px_rgba(0,0,0,0.08)] flex items-center gap-4"
            >
              {/* Dog photo */}
              <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden bg-orange-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoSrc}
                  alt={conn.dog_name}
                  className="w-full h-full object-cover"
                  style={{ objectFit: 'cover' }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900 text-base leading-tight" style={{ fontFamily: 'var(--font-fredoka)' }}>
                  {conn.dog_name}
                </p>
                {conn.dog_breed && (
                  <p className="text-xs text-stone-400 mt-0.5">{conn.dog_breed}</p>
                )}
                {conn.parent_name && (
                  <p className="text-xs text-stone-400">Owner: {conn.parent_name}</p>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleStartWalk(conn)}
                disabled={blocked || isWalkingThis || isStarting}
                className="flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 active:scale-[0.96] transition-transform"
                style={{
                  background: isWalkingThis
                    ? '#10B981'
                    : isStarting
                    ? '#9CA3AF'
                    : '#FF8C52',
                  fontFamily: 'var(--font-fredoka)',
                  minWidth: 100,
                }}
              >
                {isStarting ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    {gpsStatusMsg ? '' : 'Loading'}
                  </span>
                ) : isWalkingThis ? (
                  '🟢 Walking'
                ) : (
                  '🐾 Start Walk'
                )}
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* GPS status message shown below cards */}
      {gpsStatusMsg && !activeWalk && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center text-stone-500 mt-3"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {gpsStatusMsg}
        </motion.p>
      )}
    </motion.div>
  )
}
