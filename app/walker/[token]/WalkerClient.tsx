'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface WalkerClientProps {
  token: string
  dogName: string
  dogBreed: string | null
  healthNotes: string | null
  ownerFirstName: string
  walkerName: string
}

interface WalkLog {
  id: string
  duration_mins: number | null
  poop_count: number
  pee_count: number
  mood: string | null
  notes: string | null
  distance_km: number | null
  created_at: string
}

interface GpsPoint {
  lat: number
  lng: number
  ts: string
}

type WalkPhase = 'idle' | 'walking' | 'logging'

const MOOD_OPTIONS = [
  { value: 'great', label: '😄 Great' },
  { value: 'good', label: '🙂 Good' },
  { value: 'okay', label: '😐 Okay' },
  { value: 'tired', label: '😪 Tired' },
  { value: 'anxious', label: '😰 Anxious' },
]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function WalkerClient({
  token,
  dogName,
  dogBreed,
  healthNotes,
  ownerFirstName,
  walkerName,
}: WalkerClientProps) {
  const [phase, setPhase] = useState<WalkPhase>('idle')
  const [logs, setLogs] = useState<WalkLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // Walk tracking state
  const [elapsed, setElapsed] = useState(0)
  const [distanceKm, setDistanceKm] = useState(0)
  const [gpsRoute, setGpsRoute] = useState<GpsPoint[]>([])
  const [gpsError, setGpsError] = useState<string | null>(null)
  const walkStartRef = useRef<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastPointRef = useRef<GpsPoint | null>(null)

  // Log form state
  const [poopCount, setPoopCount] = useState(0)
  const [peeCount, setPeeCount] = useState(0)
  const [mood, setMood] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/walker/${token}/logs`)
      if (res.ok) {
        const data = await res.json()
        setLogs(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently ignore
    } finally {
      setLogsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function startWalk() {
    setGpsRoute([])
    setDistanceKm(0)
    setElapsed(0)
    setGpsError(null)
    setPhase('walking')
    walkStartRef.current = new Date()

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    // Start GPS
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const point: GpsPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            ts: new Date().toISOString(),
          }
          setGpsRoute((prev) => {
            const last = prev[prev.length - 1]
            if (last) {
              const delta = haversineKm(last.lat, last.lng, point.lat, point.lng)
              setDistanceKm((d) => +(d + delta).toFixed(3))
            }
            return [...prev, point]
          })
          lastPointRef.current = point
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError('Location access denied. Distance won\'t be tracked.')
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      )
    } else {
      setGpsError('GPS not available on this device.')
    }
  }

  function endWalk() {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    // Stop GPS
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setPhase('logging')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    const durationMins = Math.max(1, Math.round(elapsed / 60))

    try {
      const res = await fetch('/api/walk-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_token: token,
          duration_mins: durationMins,
          distance_km: distanceKm > 0 ? +distanceKm.toFixed(2) : null,
          gps_route: gpsRoute.length > 0 ? gpsRoute : null,
          poop_count: poopCount,
          pee_count: peeCount,
          mood: mood || null,
          notes: notes.trim() || null,
          started_at: walkStartRef.current?.toISOString() ?? null,
          ended_at: new Date().toISOString(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to submit. Please try again.')
        setSubmitting(false)
        return
      }

      // Reset everything
      setPoopCount(0)
      setPeeCount(0)
      setMood('')
      setNotes('')
      setElapsed(0)
      setDistanceKm(0)
      setGpsRoute([])
      setPhase('idle')
      setToast(`Walk logged! ✅ ${ownerFirstName} has been notified.`)
      setTimeout(() => setToast(null), 4000)
      fetchLogs()
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen pb-24" style={{ background: '#FFFBEB', fontFamily: 'var(--font-nunito), sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#0A2F35] text-white rounded-2xl px-5 py-4 text-sm font-semibold text-center shadow-xl animate-bounce-once"
          style={{ fontFamily: 'var(--font-nunito)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <span className="text-xl font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
          PupStep 🐾
        </span>
        <span className="text-sm text-slate-500" style={{ fontFamily: 'var(--font-nunito)' }}>
          Hi, {walkerName}
        </span>
      </div>

      {/* Dog card */}
      <div className="mx-5 mb-5 rounded-2xl bg-white border border-slate-100 px-4 py-4 flex items-center gap-4 shadow-sm">
        <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-3xl"
          style={{ background: '#FF8C52' }}>
          🐕
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 font-medium">You're walking</p>
          <p className="font-bold text-[#0A2F35] text-xl leading-tight" style={{ fontFamily: 'var(--font-fredoka)' }}>
            {dogName}
          </p>
          {dogBreed && <p className="text-xs text-slate-400">{dogBreed}</p>}
        </div>
        {phase === 'walking' && (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-700">Live</span>
          </div>
        )}
      </div>

      {/* Health note */}
      {healthNotes && (
        <div className="mx-5 mb-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
          <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
          <p className="text-sm text-amber-800 font-medium"><strong>Health note:</strong> {healthNotes}</p>
        </div>
      )}

      {/* ─── IDLE PHASE ─── */}
      {phase === 'idle' && (
        <div className="px-5 space-y-4">
          <button
            onClick={startWalk}
            className="w-full py-5 rounded-2xl font-bold text-2xl text-white shadow-lg active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #FF8C52 0%, #F07030 100%)', fontFamily: 'var(--font-fredoka)' }}
          >
            🐾 Start Walk
          </button>
          <p className="text-center text-xs text-slate-400">GPS tracking starts automatically when you begin</p>
        </div>
      )}

      {/* ─── WALKING PHASE ─── */}
      {phase === 'walking' && (
        <div className="px-5 space-y-4">
          {/* Live stats */}
          <div className="rounded-2xl bg-[#0A2F35] text-white px-5 py-5 shadow-lg">
            <p className="text-xs text-teal-300 font-bold uppercase tracking-widest mb-3">Walk in progress</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-fredoka)', letterSpacing: '0.02em' }}>
                  {formatElapsed(elapsed)}
                </p>
                <p className="text-xs text-slate-400 mt-1">elapsed</p>
              </div>
              <div>
                <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-fredoka)' }}>
                  {distanceKm.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400 mt-1">km tracked</p>
              </div>
            </div>
            {gpsError && (
              <p className="text-xs text-amber-300 mt-3">⚠️ {gpsError}</p>
            )}
            {!gpsError && gpsRoute.length > 0 && (
              <p className="text-xs text-teal-300 mt-3">📍 GPS active · {gpsRoute.length} points logged</p>
            )}
            {!gpsError && gpsRoute.length === 0 && (
              <p className="text-xs text-slate-400 mt-3">📍 Acquiring GPS signal…</p>
            )}
          </div>

          <button
            onClick={endWalk}
            className="w-full py-5 rounded-2xl font-bold text-xl text-white shadow-md active:scale-[0.97] transition-transform"
            style={{ background: '#0A2F35', fontFamily: 'var(--font-fredoka)' }}
          >
            End Walk →
          </button>
          <p className="text-center text-xs text-slate-400">Tap when the walk is done to log the report</p>
        </div>
      )}

      {/* ─── LOGGING PHASE ─── */}
      {phase === 'logging' && (
        <div className="px-5">
          {/* Summary banner */}
          <div className="rounded-2xl bg-[#0A2F35] text-white px-5 py-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-teal-300 font-bold uppercase tracking-widest">Walk complete</p>
              <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-fredoka)' }}>
                {Math.round(elapsed / 60)} min · {distanceKm.toFixed(2)} km
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-[#0A2F35] text-lg" style={{ fontFamily: 'var(--font-fredoka)' }}>
                Log the details
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">This report goes straight to {ownerFirstName}</p>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
              {/* Poop + Pee counters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    Poop 💩
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPoopCount((c) => Math.max(0, c - 1))}
                      className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-600 flex items-center justify-center active:bg-slate-50 transition-colors">
                      −
                    </button>
                    <span className="flex-1 text-center text-2xl font-bold text-[#0A2F35]"
                      style={{ fontFamily: 'var(--font-fredoka)' }}>{poopCount}</span>
                    <button type="button" onClick={() => setPoopCount((c) => c + 1)}
                      className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-600 flex items-center justify-center active:bg-slate-50 transition-colors">
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    Pee 💧
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPeeCount((c) => Math.max(0, c - 1))}
                      className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-600 flex items-center justify-center active:bg-slate-50 transition-colors">
                      −
                    </button>
                    <span className="flex-1 text-center text-2xl font-bold text-[#0A2F35]"
                      style={{ fontFamily: 'var(--font-fredoka)' }}>{peeCount}</span>
                    <button type="button" onClick={() => setPeeCount((c) => c + 1)}
                      className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-600 flex items-center justify-center active:bg-slate-50 transition-colors">
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  {dogName}&apos;s mood
                </label>
                <div className="flex gap-2 flex-wrap">
                  {MOOD_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setMood(mood === opt.value ? '' : opt.value)}
                      className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all min-h-[44px]
                        ${mood === opt.value
                          ? 'border-[#FF8C52] bg-orange-50 text-[#0A2F35]'
                          : 'border-slate-200 bg-white text-slate-600'
                        }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  Notes for {ownerFirstName}
                </label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything to report? (Optional)"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C52] resize-none"
                />
              </div>

              {submitError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md min-h-[56px]"
                style={{ background: '#FF8C52', fontFamily: 'var(--font-fredoka)' }}>
                {submitting ? 'Sending report…' : `Send report to ${ownerFirstName} ✓`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── WALK HISTORY (shown in idle phase only) ─── */}
      {phase === 'idle' && (
        <div className="px-5 mt-6">
          <h2 className="text-base font-bold text-[#0A2F35] mb-3" style={{ fontFamily: 'var(--font-fredoka)' }}>
            Recent Walks
          </h2>

          {logsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 px-5 py-8 text-center">
              <p className="text-3xl mb-2">🐾</p>
              <p className="text-sm text-slate-500">No walks logged yet. Start your first walk above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-2xl border border-slate-100 px-4 py-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {log.mood && (
                        <span className="text-xl">
                          {MOOD_OPTIONS.find((m) => m.value === log.mood)?.label.split(' ')[0] ?? '🐕'}
                        </span>
                      )}
                      <div>
                        <p className="font-bold text-[#0A2F35] text-base leading-tight"
                          style={{ fontFamily: 'var(--font-fredoka)' }}>
                          {log.duration_mins ? `${log.duration_mins} min walk` : 'Walk'}
                        </p>
                        {log.distance_km != null && log.distance_km > 0 && (
                          <p className="text-xs text-slate-400">{log.distance_km} km</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0 pt-0.5">{formatDate(log.created_at)}</span>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-500">
                    <span>💩 {log.poop_count}</span>
                    <span>💧 {log.pee_count}</span>
                    {log.mood && <span className="capitalize text-slate-400">{log.mood}</span>}
                  </div>
                  {log.notes && (
                    <p className="text-xs text-slate-400 mt-2 italic">&ldquo;{log.notes}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bookmark hint */}
          <div className="mt-6 rounded-2xl bg-[#0A2F35] bg-opacity-5 border border-[#0A2F35] border-opacity-10 px-4 py-3 text-center">
            <p className="text-xs text-[#0D3D45] font-medium">📌 Bookmark this page — it's your permanent walk log</p>
          </div>
        </div>
      )}
    </div>
  )
}
