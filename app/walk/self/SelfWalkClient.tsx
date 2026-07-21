'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CLAY_SHADOW_CREAM, CLAY_SHADOW_TEAL, CLAY_SHADOW_ORANGE, CLAY_SHADOW_ORANGE_SM } from '@/lib/clayShadows'
import { LoadingButton } from '@/components/LoadingButton'
import { trackEvent } from '@/lib/analytics'

interface Dog {
  id: string
  name: string
  photo_url: string | null
}

interface GpsPoint {
  lat: number
  lng: number
  ts: string
  accuracy?: number
}

interface WalkEvent {
  type: 'pee' | 'poop'
  lat: number | null
  lng: number | null
  ts: string
  photoUrl?: string | null
}

type Phase = 'idle' | 'walking' | 'logging' | 'success'

const MOOD_OPTIONS = [
  { value: 'great', emoji: '😊', label: 'Great' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'issue', emoji: '😟', label: 'Had a problem' },
]

// Same haversine + GPS-quality heuristics as app/walker/[token]/WalkerClient.tsx —
// kept in sync deliberately rather than imported, since that file is a live,
// load-bearing walker-facing surface we don't want this feature touching at all.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function SelfWalkClient({ dogs }: { dogs: Dog[] }) {
  const reduceMotion = useReducedMotion()
  const [selectedDogId, setSelectedDogId] = useState(dogs[0]?.id ?? '')
  const [phase, setPhase] = useState<Phase>('idle')

  const [elapsed, setElapsed] = useState(0)
  const [distanceKm, setDistanceKm] = useState(0)
  const [gpsRoute, setGpsRoute] = useState<GpsPoint[]>([])
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [walkEvents, setWalkEvents] = useState<WalkEvent[]>([])

  const [poopPhotoPrompt, setPoopPhotoPrompt] = useState(false)
  const [pendingPoopEvent, setPendingPoopEvent] = useState<{ lat: number | null; lng: number | null; ts: string } | null>(null)
  const [poopPhotoUploading, setPoopPhotoUploading] = useState(false)
  const poopPhotoInputRef = useRef<HTMLInputElement>(null)

  const [mood, setMood] = useState('')
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [reportUrl, setReportUrl] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastPointRef = useRef<GpsPoint | null>(null)
  const walkStartRef = useRef<Date | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // Silently fail — device just doesn't support it
    }
  }, [])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && wakeLockRef.current?.released) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [requestWakeLock])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  function startWalk() {
    setGpsRoute([])
    setDistanceKm(0)
    setElapsed(0)
    setGpsError(null)
    setWalkEvents([])
    setPhase('walking')
    walkStartRef.current = new Date()
    trackEvent('self_walk_started', { dog_id: selectedDogId })

    requestWakeLock()

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const accuracy = pos.coords.accuracy
          if (accuracy > 100) return

          const point: GpsPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            ts: new Date().toISOString(),
            accuracy,
          }

          setGpsRoute((prev) => {
            const last = prev[prev.length - 1]
            if (last) {
              const delta = haversineKm(last.lat, last.lng, point.lat, point.lng)
              const elapsedSec = (new Date(point.ts).getTime() - new Date(last.ts).getTime()) / 1000
              const impliedSpeed = elapsedSec > 0 ? (delta * 1000) / elapsedSec : 0
              if (impliedSpeed > 20) return prev
              if (delta * 1000 < 3 && elapsedSec < 5) return prev
              setDistanceKm((d) => +(d + delta).toFixed(3))
            }
            return [...prev, point]
          })
          lastPointRef.current = point
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError("Location access denied. Distance won't be tracked.")
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      )
    } else {
      setGpsError('GPS not available on this device.')
    }
  }

  function endWalk() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    setPhase('logging')
  }

  function handlePeeTap() {
    const loc = lastPointRef.current
    setWalkEvents(prev => [...prev, {
      type: 'pee',
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      ts: new Date().toISOString(),
    }])
  }

  function handlePoopTap() {
    const loc = lastPointRef.current
    setPendingPoopEvent({
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      ts: new Date().toISOString(),
    })
    setPoopPhotoPrompt(true)
  }

  async function handlePoopPhotoTaken(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingPoopEvent) return
    setPoopPhotoUploading(true)
    try {
      const { compressImage } = await import('@/lib/compressImage')
      const compressed = await compressImage(file)
      const path = `poop-photos/self/${selectedDogId}/${Date.now()}.jpg`
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from('provider-photos')
        .upload(path, compressed, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
      setWalkEvents(prev => [...prev, {
        type: 'poop', lat: pendingPoopEvent.lat, lng: pendingPoopEvent.lng, ts: pendingPoopEvent.ts, photoUrl: data.publicUrl,
      }])
    } catch {
      setWalkEvents(prev => [...prev, {
        type: 'poop', lat: pendingPoopEvent.lat, lng: pendingPoopEvent.lng, ts: pendingPoopEvent.ts,
      }])
    } finally {
      setPoopPhotoUploading(false)
      setPoopPhotoPrompt(false)
      setPendingPoopEvent(null)
      if (poopPhotoInputRef.current) poopPhotoInputRef.current.value = ''
    }
  }

  function handlePoopSkip() {
    if (!pendingPoopEvent) return
    setWalkEvents(prev => [...prev, {
      type: 'poop', lat: pendingPoopEvent.lat, lng: pendingPoopEvent.lng, ts: pendingPoopEvent.ts,
    }])
    setPoopPhotoPrompt(false)
    setPendingPoopEvent(null)
  }

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { compressImage } = await import('@/lib/compressImage')
      const compressed = await compressImage(file)
      const path = `walk-photos/self/${selectedDogId}/${Date.now()}.jpg`
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.storage
        .from('provider-photos')
        .upload(path, compressed, { contentType: 'image/jpeg' })
      if (!error) {
        const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
        setPhotoUrl(data.publicUrl)
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)

    const durationMins = Math.max(1, Math.round(elapsed / 60))
    const finalPoopCount = walkEvents.filter(e => e.type === 'poop').length
    const finalPeeCount = walkEvents.filter(e => e.type === 'pee').length

    try {
      const res = await fetch('/api/walk-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          self_walk: true,
          dog_id: selectedDogId,
          duration_mins: durationMins,
          distance_km: distanceKm > 0 ? +distanceKm.toFixed(2) : null,
          gps_route: gpsRoute.length > 0 ? gpsRoute : null,
          photo_url: photoUrl ?? null,
          poop_count: finalPoopCount,
          pee_count: finalPeeCount,
          mood: mood || null,
          notes: notes || null,
          started_at: walkStartRef.current?.toISOString(),
          ended_at: new Date().toISOString(),
          walk_events: walkEvents,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}`)
      setReportUrl(json.report_url ?? null)
      trackEvent('self_walk_completed', { dog_id: selectedDogId })
      setPhase('success')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save the walk. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleLogAnother() {
    setPhase('idle')
    setElapsed(0)
    setDistanceKm(0)
    setGpsRoute([])
    setWalkEvents([])
    setMood('')
    setNotes('')
    setPhotoUrl(null)
    setReportUrl(null)
    setSubmitError(null)
  }

  const selectedDog = dogs.find(d => d.id === selectedDogId)

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(180deg, #FFFBEB 0%, #FFF3C4 100%)' }}>
      {/* Header */}
      <div className="flex items-center px-4 h-14" style={{ background: 'rgba(255,251,235,0.95)', borderBottom: '1px solid oklch(0.906 0.06 88)' }}>
        <Link href="/home" className="text-sm font-semibold" style={{ color: 'oklch(0.48 0.17 196)', fontFamily: 'var(--font-nunito)' }}>
          ← Back to dashboard
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 pb-16">
        <AnimatePresence mode="wait">
          {/* ── IDLE ── */}
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <div className="text-center mb-8">
                <span className="text-5xl">🐾</span>
                <h1 className="text-2xl font-bold mt-3" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>
                  Walking {selectedDog?.name ?? 'your dog'} yourself?
                </h1>
                <p className="text-sm mt-2" style={{ fontFamily: 'var(--font-nunito)', color: '#64748B' }}>
                  Track the route, log potty breaks, and get the same report card, no walker needed.
                </p>
              </div>

              {dogs.length > 1 && (
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(10,47,53,0.4)', fontFamily: 'var(--font-nunito)' }}>
                    Which dog?
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {dogs.map(dog => (
                      <button
                        key={dog.id}
                        onClick={() => setSelectedDogId(dog.id)}
                        className="px-4 py-2 rounded-full text-sm font-semibold"
                        style={{
                          background: dog.id === selectedDogId ? 'oklch(0.48 0.17 196)' : '#fff',
                          color: dog.id === selectedDogId ? '#fff' : '#0A2F35',
                          boxShadow: dog.id === selectedDogId ? 'none' : CLAY_SHADOW_CREAM,
                          fontFamily: 'var(--font-nunito)',
                        }}
                      >
                        {dog.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-3xl p-7" style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}>
                {gpsError && <p className="text-xs text-center mb-4" style={{ color: '#DC2626', fontFamily: 'var(--font-nunito)' }}>{gpsError}</p>}
                <button
                  onClick={startWalk}
                  className="w-full py-4 rounded-2xl font-bold text-base active:scale-[0.97] transition-transform"
                  style={{ background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)', color: '#451A03', boxShadow: CLAY_SHADOW_ORANGE, fontFamily: 'var(--font-nunito)' }}
                >
                  Start Walk
                </button>
              </div>
            </motion.div>
          )}

          {/* ── WALKING ── */}
          {phase === 'walking' && (
            <motion.div
              key="walking"
              initial={reduceMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-3xl p-7 mb-5 text-center" style={{ background: '#0A2F35', boxShadow: CLAY_SHADOW_TEAL }}>
                <p className="text-6xl font-bold tabular-nums" style={{ fontFamily: 'var(--font-fredoka)', color: '#FFFBEB' }}>
                  {formatTime(elapsed)}
                </p>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,251,235,0.6)', fontFamily: 'var(--font-nunito)' }}>
                  {distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : 'Getting GPS…'}
                </p>
                {gpsError && <p className="text-xs mt-2" style={{ color: 'rgba(255,140,82,0.9)' }}>{gpsError}</p>}
                {typeof window !== 'undefined' && !('wakeLock' in navigator) && (
                  <p className="text-xs mt-3" style={{ color: 'rgba(255,140,82,0.9)', fontFamily: 'var(--font-nunito)' }}>
                    🔆 Keep your screen on for accurate tracking
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={handlePeeTap}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-5 active:scale-[0.97] transition-transform"
                  style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}
                >
                  <span className="text-3xl">💧</span>
                  <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}>
                    Pee
                    {walkEvents.filter(e => e.type === 'pee').length > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white" style={{ background: 'oklch(0.48 0.17 196)' }}>
                        {walkEvents.filter(e => e.type === 'pee').length}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={handlePoopTap}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-5 active:scale-[0.97] transition-transform"
                  style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}
                >
                  <span className="text-3xl">💩</span>
                  <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}>
                    Poop
                    {walkEvents.filter(e => e.type === 'poop').length > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white" style={{ background: 'oklch(0.48 0.17 196)' }}>
                        {walkEvents.filter(e => e.type === 'poop').length}
                      </span>
                    )}
                  </span>
                </button>
              </div>

              <button
                onClick={endWalk}
                className="w-full py-4 rounded-2xl font-bold text-base active:scale-[0.97] transition-transform"
                style={{ background: '#fff', color: '#DC2626', boxShadow: CLAY_SHADOW_CREAM, fontFamily: 'var(--font-nunito)' }}
              >
                End Walk
              </button>
            </motion.div>
          )}

          {/* ── LOGGING (post-walk form) ── */}
          {phase === 'logging' && (
            <motion.div
              key="logging"
              initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>Walk done!</h1>
              <p className="text-sm mb-6" style={{ color: '#64748B', fontFamily: 'var(--font-nunito)' }}>
                {formatTime(elapsed)} · {distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : 'no route recorded'}
              </p>

              <div className="rounded-3xl p-6 mb-4" style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(10,47,53,0.4)', fontFamily: 'var(--font-nunito)' }}>Mood</p>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {MOOD_OPTIONS.map(({ value, emoji, label }) => (
                    <button
                      key={value}
                      onClick={() => setMood(m => m === value ? '' : value)}
                      className="flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-[0.97]"
                      style={{
                        background: mood === value ? 'oklch(0.48 0.17 196 / 0.1)' : '#F9FAFB',
                        border: mood === value ? '1.5px solid oklch(0.48 0.17 196)' : '1px solid transparent',
                      }}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-xs font-semibold mt-1" style={{ color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}>{label}</span>
                    </button>
                  ))}
                </div>

                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(10,47,53,0.4)', fontFamily: 'var(--font-nunito)' }}>Photo (optional)</p>
                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} id="self-walk-photo" />
                <label
                  htmlFor="self-walk-photo"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm mb-5 cursor-pointer"
                  style={{ background: '#F9FAFB', color: uploading ? '#9CA3AF' : '#0A2F35', border: '1.5px dashed #D1D5DB', fontFamily: 'var(--font-nunito)' }}
                >
                  {uploading ? 'Uploading…' : photoUrl ? '📸 Photo added' : '📸 Add a photo'}
                </label>

                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(10,47,53,0.4)', fontFamily: 'var(--font-nunito)' }}>Notes (optional)</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anything worth noting?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                  style={{ background: '#F9FAFB', color: '#0A2F35', fontFamily: 'var(--font-nunito)', border: '1px solid #E5E7EB' }}
                />
              </div>

              {submitError && (
                <p className="text-xs text-center mb-3" style={{ color: '#DC2626', fontFamily: 'var(--font-nunito)' }}>{submitError}</p>
              )}

              <LoadingButton
                onClick={handleSubmit}
                loading={submitting}
                loadingText="Saving…"
                className="w-full rounded-2xl text-base"
                style={{ padding: '16px', background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)', color: '#451A03', boxShadow: CLAY_SHADOW_ORANGE }}
              >
                Save walk report
              </LoadingButton>
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {phase === 'success' && (
            <motion.div
              key="success"
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
              className="text-center"
            >
              <div className="rounded-3xl px-7 py-10" style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'oklch(0.48 0.17 196 / 0.1)' }}>
                  <span className="text-3xl">✅</span>
                </div>
                <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>Report saved!</h1>
                <p className="text-sm mb-7" style={{ color: '#64748B', fontFamily: 'var(--font-nunito)' }}>
                  {selectedDog?.name ?? 'Your dog'}'s walk is logged, right alongside every other report.
                </p>

                {reportUrl && (
                  <Link
                    href={reportUrl}
                    className="block w-full py-3.5 rounded-2xl font-bold text-sm mb-3"
                    style={{ background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)', color: '#451A03', boxShadow: CLAY_SHADOW_ORANGE_SM, fontFamily: 'var(--font-nunito)' }}
                  >
                    View report →
                  </Link>
                )}
                <Link
                  href="/home"
                  className="block w-full py-3.5 rounded-2xl font-bold text-sm mb-3"
                  style={{ background: '#fff', color: 'oklch(0.48 0.17 196)', border: '1.5px solid oklch(0.48 0.17 196)', fontFamily: 'var(--font-nunito)' }}
                >
                  Back to dashboard
                </Link>
                <button
                  onClick={handleLogAnother}
                  className="text-sm font-semibold"
                  style={{ color: '#9CA3AF', fontFamily: 'var(--font-nunito)' }}
                >
                  Log another walk
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Poop photo prompt bottom sheet */}
      {poopPhotoPrompt && (
        <>
          <div className="fixed inset-0 z-[60]" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl p-5" style={{ background: '#fff', paddingBottom: 'env(safe-area-inset-bottom, 20px)', boxShadow: '0 -8px 32px rgba(10,47,53,0.18)' }}>
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: '#E5E7EB' }} />
            </div>
            <p className="text-center text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>💩 Poop marked!</p>
            <p className="text-center text-sm mb-5" style={{ color: '#6B7280', fontFamily: 'var(--font-nunito)' }}>Add a photo? It helps track health patterns over time.</p>
            <input ref={poopPhotoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePoopPhotoTaken} id="self-walk-poop-photo" />
            <label
              htmlFor="self-walk-poop-photo"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-base mb-2.5 cursor-pointer"
              style={{ background: '#FF8C52', color: '#fff', boxShadow: CLAY_SHADOW_ORANGE_SM }}
            >
              {poopPhotoUploading ? 'Uploading…' : '📷 Take photo'}
            </label>
            <button
              onClick={handlePoopSkip}
              disabled={poopPhotoUploading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm"
              style={{ background: '#F3F4F6', color: '#6B7280' }}
            >
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  )
}
