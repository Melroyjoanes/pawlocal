'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Haversine distance (km) ─────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const STEPS_PER_KM = 1350
const EASE = [0.25, 0.46, 0.45, 0.94] as const

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

type WalkHistoryItem = {
  id: string
  pet_name: string | null
  started_at: string
  ended_at: string | null
  distance_km: number | null
  step_count: number | null
  walk_events: { type: string }[]
}

function thisMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  providerId: string
  firstName: string
}

export default function ProFitnessClient({ providerId, firstName }: Props) {
  // History (from Supabase)
  const [walks, setWalks] = useState<WalkHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Active walk state
  const [isWalking, setIsWalking] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [distance, setDistance] = useState(0)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [dogName, setDogName] = useState('')
  const [showEndPrompt, setShowEndPrompt] = useState(false)
  const [saving, setSaving] = useState(false)

  // Supabase session tracking
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Events (pee/poop)
  const [events, setEvents] = useState<{ type: 'pee' | 'poop'; ts: string }[]>([])

  // Refs
  const watchIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<string | null>(null)
  const distanceRef = useRef(0)
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const currentPosRef = useRef<{ lat: number; lon: number } | null>(null)

  // ─── Load history from Supabase ───────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/pro/walks')
      if (res.ok) {
        const data = await res.json()
        setWalks(Array.isArray(data) ? data.filter((w: WalkHistoryItem) => w.ended_at) : [])
      }
    } catch { /* silent */ }
    setHistoryLoading(false)
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  // ─── GPS position handler ─────────────────────────────────────────────────

  const onPosition = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude } = pos.coords
    currentPosRef.current = { lat: latitude, lon: longitude }
    if (lastPosRef.current) {
      const d = haversine(lastPosRef.current.lat, lastPosRef.current.lon, latitude, longitude)
      if (d > 0.002 && d < 0.1) {
        distanceRef.current += d
        setDistance(Math.round(distanceRef.current * 100) / 100)
      }
    }
    lastPosRef.current = { lat: latitude, lon: longitude }
  }, [])

  // ─── Start walk ───────────────────────────────────────────────────────────

  async function startWalk() {
    setGpsError(null)
    distanceRef.current = 0
    lastPosRef.current = null
    currentPosRef.current = null
    startTimeRef.current = new Date().toISOString()
    setDistance(0)
    setElapsed(0)
    setEvents([])

    // Create Supabase session
    try {
      const res = await fetch('/api/pro/walks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_name: null }),
      })
      if (res.ok) {
        const { session, trackingUrl: url } = await res.json()
        setActiveSessionId(session.id)
        sessionIdRef.current = session.id
        setTrackingUrl(url)
      }
    } catch { /* fail silently — walk still works locally */ }

    setIsWalking(true)

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsed(s => s + 1)
    }, 1000)

    // Start GPS
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        onPosition,
        (err) => {
          console.warn('[GPS]', err.message)
          setGpsError('GPS unavailable — distance will be 0')
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      )
    } else {
      setGpsError('GPS not supported on this device')
    }

    // Send location to Supabase every 10 seconds
    locationIntervalRef.current = setInterval(async () => {
      const sid = sessionIdRef.current
      const pos = currentPosRef.current
      if (!sid || !pos) return
      try {
        await fetch(`/api/pro/walks/${sid}/location`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: pos.lat, lng: pos.lon }),
        })
      } catch { /* silent */ }
    }, 10000)
  }

  // ─── Stop walk ────────────────────────────────────────────────────────────

  function stopWalk() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null }
    setShowEndPrompt(true)
  }

  // ─── Save walk ────────────────────────────────────────────────────────────

  async function saveWalk() {
    setSaving(true)
    const finalDistance = Math.round(distanceRef.current * 100) / 100
    const finalSteps = Math.round(finalDistance * STEPS_PER_KM)
    const sid = sessionIdRef.current

    if (sid) {
      // Update pet_name and end the session in Supabase
      try {
        // If dogName was given, start a new session with the pet name — or just end with stats
        await fetch(`/api/pro/walks/${sid}/end`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distance_km: finalDistance,
            step_count: finalSteps,
          }),
        })
      } catch { /* silent */ }
    }

    await loadHistory()
    setIsWalking(false)
    setShowEndPrompt(false)
    setElapsed(0)
    setDistance(0)
    setDogName('')
    setActiveSessionId(null)
    sessionIdRef.current = null
    setTrackingUrl(null)
    setEvents([])
    distanceRef.current = 0
    setSaving(false)
  }

  // ─── Discard walk ─────────────────────────────────────────────────────────

  async function discardWalk() {
    const sid = sessionIdRef.current
    if (sid) {
      // End the session with 0 distance
      fetch(`/api/pro/walks/${sid}/end`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distance_km: 0, step_count: 0 }),
      }).catch(() => {})
    }
    setIsWalking(false)
    setShowEndPrompt(false)
    setElapsed(0)
    setDistance(0)
    setDogName('')
    setActiveSessionId(null)
    sessionIdRef.current = null
    setTrackingUrl(null)
    setEvents([])
    distanceRef.current = 0
  }

  // ─── Pee / Poop buttons ───────────────────────────────────────────────────

  async function logEvent(type: 'pee' | 'poop') {
    const ev = { type, ts: new Date().toISOString() }
    setEvents(prev => [...prev, ev])
    const sid = sessionIdRef.current
    if (sid) {
      const pos = currentPosRef.current
      fetch(`/api/pro/walks/${sid}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lat: pos?.lat, lng: pos?.lon }),
      }).catch(() => {})
    }
  }

  // ─── Copy tracking URL ────────────────────────────────────────────────────

  function copyLink() {
    if (!trackingUrl) return
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ─── Monthly stats ────────────────────────────────────────────────────────

  const mk = thisMonthKey()
  const thisMonth = walks.filter(w => w.started_at.startsWith(mk))
  const monthKm = thisMonth.reduce((s, w) => s + (w.distance_km ?? 0), 0)
  const monthSteps = thisMonth.reduce((s, w) => s + (w.step_count ?? 0), 0)
  const monthWalks = thisMonth.length
  const monthMinutes = thisMonth.reduce((s, w) => {
    if (!w.started_at || !w.ended_at) return s
    return s + Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000)
  }, 0)

  const liveSteps = Math.round(distance * STEPS_PER_KM)
  const peeCount = events.filter(e => e.type === 'pee').length
  const poopCount = events.filter(e => e.type === 'poop').length

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-stone-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <h1 className="font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20 }}>
            Fitness Tracker
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Monthly stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="grid grid-cols-4 gap-2"
        >
          {[
            { label: 'Walks', value: monthWalks.toString(), icon: '🦮' },
            { label: 'Km', value: monthKm.toFixed(1), icon: '📍' },
            { label: 'Steps', value: monthSteps >= 1000 ? `${(monthSteps / 1000).toFixed(1)}k` : monthSteps.toString(), icon: '👟' },
            { label: 'Hours', value: (monthMinutes / 60).toFixed(1), icon: '⏱' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-border p-3 text-center shadow-sm">
              <div className="text-lg mb-0.5">{icon}</div>
              <p className="font-bold text-stone-900 text-base leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</p>
              <p className="text-[9px] text-stone-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
        <p className="text-[11px] text-stone-400 text-center -mt-3">This month · steps estimated at 1,350/km</p>

        {/* Active walk card */}
        <AnimatePresence mode="wait">
          {isWalking ? (
            <motion.div
              key="active"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="rounded-3xl p-6"
              style={{
                background: 'linear-gradient(135deg, #0D3528 0%, #1A5C42 100%)',
                boxShadow: '0 8px 0px rgba(5,150,105,0.3), 0 20px 50px rgba(5,150,105,0.25)',
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-2.5 h-2.5 rounded-full bg-emerald-400"
                />
                <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest">Walk in progress</span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-white tabular-nums" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {formatDuration(elapsed)}
                  </p>
                  <p className="text-emerald-300 text-xs mt-1">Duration</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {distance.toFixed(2)}
                  </p>
                  <p className="text-emerald-300 text-xs mt-1">km</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {liveSteps >= 1000 ? `${(liveSteps / 1000).toFixed(1)}k` : liveSteps}
                  </p>
                  <p className="text-emerald-300 text-xs mt-1">Est. steps</p>
                </div>
              </div>

              {/* Pee / Poop buttons */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => logEvent('pee')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-white/15 text-white hover:bg-white/20 transition-colors"
                >
                  💧 Pee {peeCount > 0 && <span className="text-emerald-300 text-xs">×{peeCount}</span>}
                </button>
                <button
                  onClick={() => logEvent('poop')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-white/15 text-white hover:bg-white/20 transition-colors"
                >
                  💩 Poop {poopCount > 0 && <span className="text-emerald-300 text-xs">×{poopCount}</span>}
                </button>
              </div>

              {/* Live tracking link */}
              {trackingUrl && (
                <button
                  onClick={copyLink}
                  className="w-full mb-3 py-2.5 rounded-xl text-xs font-semibold bg-white/10 text-emerald-200 hover:bg-white/20 transition-colors text-left px-3 flex items-center gap-2"
                >
                  <span className="text-base">📍</span>
                  <span className="flex-1 truncate">{copied ? '✓ Link copied!' : 'Share live location'}</span>
                  <span className="text-emerald-400 text-xs shrink-0">Tap to copy →</span>
                </button>
              )}

              {gpsError && (
                <p className="text-amber-300 text-xs text-center mb-3 bg-amber-400/10 rounded-xl px-3 py-2">
                  ⚠ {gpsError}
                </p>
              )}

              <button
                onClick={stopWalk}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-stone-900 transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(160deg, #FCD34D, #F59E0B)' }}
              >
                ⏹ End walk
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="start"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="bg-white rounded-3xl border border-border p-6 text-center shadow-sm"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="text-5xl mb-4"
              >
                🦮
              </motion.div>
              <h2 className="text-lg font-bold text-stone-900 mb-1">Ready for a walk?</h2>
              <p className="text-sm text-stone-400 mb-1">
                GPS tracks your distance automatically.
              </p>
              <p className="text-xs text-stone-300 mb-5">
                A live tracking link is generated — share it with the pet owner!
              </p>
              <button
                onClick={startWalk}
                className="w-full py-4 rounded-2xl font-bold text-sm text-white shadow-lg transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #0D3528, #1A5C42)', boxShadow: '0 6px 0px rgba(5,150,105,0.3), 0 14px 30px rgba(5,150,105,0.2)' }}
              >
                🏃 Start walk
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Walk history */}
        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : walks.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Recent walks</p>
            <div className="space-y-2">
              {walks.slice(0, 20).map((w, i) => {
                const durationMin = w.started_at && w.ended_at
                  ? Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000)
                  : 0
                const pees = w.walk_events?.filter(e => e.type === 'pee').length ?? 0
                const poops = w.walk_events?.filter(e => e.type === 'poop').length ?? 0
                return (
                  <div key={w.id} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0">
                      🦮
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800">
                        {w.pet_name ? `Walk with ${w.pet_name}` : `Walk #${walks.length - i}`}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {formatDate(w.started_at)}
                        {(pees > 0 || poops > 0) && ` · 💧${pees} 💩${poops}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-stone-900">{(w.distance_km ?? 0).toFixed(2)} km</p>
                      <p className="text-[10px] text-stone-400">{(w.step_count ?? 0).toLocaleString('en-IN')} steps · {durationMin}min</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        ) : !isWalking ? (
          <div className="bg-white rounded-2xl border border-border p-6 text-center">
            <p className="text-stone-400 text-sm">Your walk history will appear here.</p>
          </div>
        ) : null}

      </main>

      {/* End walk prompt */}
      <AnimatePresence>
        {showEndPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
              <div className="max-w-lg mx-auto px-5 pt-5 pb-6">
                <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mb-5" />
                <h2 className="text-lg font-bold text-stone-900 mb-1">Walk complete! 🎉</h2>

                <div className="flex items-center gap-6 my-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif" }}>{formatDuration(elapsed)}</p>
                    <p className="text-xs text-stone-400">Duration</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif" }}>{distance.toFixed(2)} km</p>
                    <p className="text-xs text-stone-400">Distance</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif" }}>{liveSteps.toLocaleString()}</p>
                    <p className="text-xs text-stone-400">Steps</p>
                  </div>
                </div>

                {(peeCount > 0 || poopCount > 0) && (
                  <div className="flex gap-3 mb-4 text-center">
                    <div className="flex-1 bg-stone-50 rounded-xl py-2">
                      <p className="text-lg">💧</p>
                      <p className="text-xs text-stone-500 font-medium">{peeCount} pee{peeCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 bg-stone-50 rounded-xl py-2">
                      <p className="text-lg">💩</p>
                      <p className="text-xs text-stone-500 font-medium">{poopCount} poop{poopCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="text-xs font-semibold text-stone-500 block mb-1.5">Dog&apos;s name (optional)</label>
                  <input
                    type="text"
                    placeholder="Bruno"
                    value={dogName}
                    onChange={e => setDogName(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={discardWalk}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-stone-500 border border-border hover:bg-stone-50 transition-colors disabled:opacity-50"
                  >
                    Discard
                  </button>
                  <button
                    onClick={saveWalk}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                    style={{ backgroundColor: 'oklch(0.48 0.17 196)', flexGrow: 2 }}
                  >
                    {saving ? 'Saving…' : 'Save walk ✓'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
