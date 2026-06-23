'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Live map shown to walker during walk ──────────────────────────────────────
function LiveMap({
  currentPos,
  routePointsRef,
  poopEvents,
  peeEvents,
}: {
  currentPos: { lat: number; lng: number } | null
  routePointsRef: React.RefObject<{ lat: number; lng: number }[]>
  poopEvents: { lat: number; lng: number; ts: string }[]
  peeEvents: { lat: number; lng: number; ts: string }[]
}) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const posMarkerRef = useRef<google.maps.Marker | null>(null)
  const eventMarkersRef = useRef<google.maps.Marker[]>([])

  useEffect(() => {
    function initMap() {
      if (!mapDivRef.current) return
      const center = currentPos ?? { lat: 19.098, lng: 72.827 } // Juhu, Mumbai default
      const gm = (window as { google?: { maps: typeof google.maps } }).google!.maps

      const map = new gm.Map(mapDivRef.current, {
        center,
        zoom: 17,
        disableDefaultUI: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      })
      mapRef.current = map

      polylineRef.current = new gm.Polyline({
        geodesic: true,
        strokeColor: '#0f766e',
        strokeOpacity: 1,
        strokeWeight: 5,
        map,
      })

      posMarkerRef.current = new gm.Marker({
        position: center,
        map,
        zIndex: 10,
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#0f766e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      })
    }

    if ((window as { google?: { maps: typeof google.maps } }).google?.maps) {
      initMap()
    } else {
      const existing = document.getElementById('gmaps-script')
      if (!existing) {
        const script = document.createElement('script')
        script.id = 'gmaps-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        script.async = true
        script.onload = initMap
        document.head.appendChild(script)
      } else {
        existing.addEventListener('load', initMap)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pan + update route on every new GPS point
  useEffect(() => {
    if (!mapRef.current || !currentPos) return
    posMarkerRef.current?.setPosition(currentPos)
    polylineRef.current?.setPath(routePointsRef.current ?? [])
    mapRef.current.panTo(currentPos)
  }, [currentPos, routePointsRef])

  // Add poop/pee markers when events change
  useEffect(() => {
    if (!mapRef.current) return
    const gm = (window as { google?: { maps: typeof google.maps } }).google?.maps
    if (!gm) return

    // Clear old event markers
    eventMarkersRef.current.forEach(m => m.setMap(null))
    eventMarkersRef.current = []

    const allEvents = [
      ...poopEvents.map(e => ({ ...e, emoji: '💩' })),
      ...peeEvents.map(e => ({ ...e, emoji: '💧' })),
    ]

    allEvents.forEach(evt => {
      const marker = new gm.Marker({
        position: { lat: evt.lat, lng: evt.lng },
        map: mapRef.current!,
        label: { text: evt.emoji, fontSize: '16px' },
        icon: { path: gm.SymbolPath.CIRCLE, scale: 0 }, // invisible base, emoji label only
      })
      eventMarkersRef.current.push(marker)
    })
  }, [poopEvents, peeEvents])

  return <div ref={mapDivRef} className="w-full h-full" />
}

interface WalkerClientProps {
  token: string
  dogName: string
  dogBreed: string | null
  dogPhotoUrl: string | null
  healthNotes: string | null
  ownerFirstName: string
  walkerName: string
  ownerPhone: string | null
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

interface WalkEvent {
  type: 'pee' | 'poop'
  lat: number | null
  lng: number | null
  ts: string
  photoUrl?: string | null
}

type WalkPhase = 'idle' | 'walking' | 'logging' | 'success'
type WalkerTab = 'walk' | 'grooming' | 'settings'

const MOOD_OPTIONS = [
  { value: 'great', emoji: '😊', label: 'Great' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'issue', emoji: '😟', label: 'Had a problem' },
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
  dogPhotoUrl,
  healthNotes,
  ownerFirstName,
  walkerName,
  ownerPhone,
}: WalkerClientProps) {
  const [phase, setPhase] = useState<WalkPhase>('idle')
  const [logs, setLogs] = useState<WalkLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<WalkerTab>('walk')
  const [showSaveNotice, setShowSaveNotice] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(`pup-saved-${token}`)
    if (!dismissed) setShowSaveNotice(true)
  }, [token])

  function dismissSaveNotice() {
    localStorage.setItem(`pup-saved-${token}`, '1')
    setShowSaveNotice(false)
  }

  // Walk tracking state
  const [elapsed, setElapsed] = useState(0)
  const [distanceKm, setDistanceKm] = useState(0)
  const [gpsRoute, setGpsRoute] = useState<GpsPoint[]>([])
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null)
  const routePointsRef = useRef<{ lat: number; lng: number }[]>([])
  const walkStartRef = useRef<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastPointRef = useRef<GpsPoint | null>(null)

  // Keep routePointsRef in sync with gpsRoute state (for LiveMap polyline)
  useEffect(() => {
    routePointsRef.current = gpsRoute.map(p => ({ lat: p.lat, lng: p.lng }))
  }, [gpsRoute])

  // Real-time walk events (pee/poop during walk)
  const [walkEvents, setWalkEvents] = useState<WalkEvent[]>([])
  const poopPhotoInputRef = useRef<HTMLInputElement>(null)
  const [poopPhotoUploading, setPoopPhotoUploading] = useState(false)

  // Log form state
  const [mood, setMood] = useState('')
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [parentWaLink, setParentWaLink] = useState<string | null>(null)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [startWaLink, setStartWaLink] = useState<string | null>(null)

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `walk-photos/${token}/${Date.now()}.${ext}`
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.storage.from('provider-photos').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
        setPhotoUrl(data.publicUrl)
      }
    } finally {
      setUploading(false)
    }
  }

  async function handlePoopPhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPoopPhotoUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `walk-photos/${token}/poop-${Date.now()}.${ext}`
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.storage.from('provider-photos').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
        const url = data.publicUrl
        setWalkEvents(prev => {
          const copy = [...prev]
          const lastPoop = [...copy].reverse().find(ev => ev.type === 'poop' && !ev.photoUrl)
          if (lastPoop) lastPoop.photoUrl = url
          return copy
        })
      }
    } finally {
      setPoopPhotoUploading(false)
      // Reset input so same file can be picked again
      if (poopPhotoInputRef.current) poopPhotoInputRef.current.value = ''
    }
  }

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
    setCurrentPos(null)
    setWalkEvents([])
    setPhase('walking')
    walkStartRef.current = new Date()

    // Generate walk-started WhatsApp link for parent notification and auto-open
    if (ownerPhone) {
      const phone = ownerPhone.replace(/\D/g, '')
      const fullPhone = phone.startsWith('91') ? phone : `91${phone}`
      const msg = `🐾 ${dogName}'s walk has started!\n\n${walkerName} is now walking ${dogName}. You'll get a full report when the walk ends.\n\nPowered by PupStep`
      const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
      setStartWaLink(waUrl)
      // Auto-open WhatsApp to notify parent
      setTimeout(() => window.open(waUrl, '_blank'), 300)
    }

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
          setCurrentPos({ lat: point.lat, lng: point.lng })
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
    // Auto-open camera after form renders
    setTimeout(() => photoInputRef.current?.click(), 400)
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
    setWalkEvents(prev => [...prev, {
      type: 'poop',
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      ts: new Date().toISOString(),
      photoUrl: null,
    }])
    poopPhotoInputRef.current?.click()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
          connection_token: token,
          duration_mins: durationMins,
          distance_km: distanceKm > 0 ? +distanceKm.toFixed(2) : null,
          gps_route: gpsRoute.length > 0 ? gpsRoute : null,
          photo_url: photoUrl ?? null,
          poop_count: finalPoopCount,
          pee_count: finalPeeCount,
          mood: mood || null,
          notes: notes.trim() || null,
          started_at: walkStartRef.current?.toISOString() ?? null,
          ended_at: new Date().toISOString(),
          walk_events: walkEvents,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to submit. Please try again.')
        setSubmitting(false)
        return
      }

      // Reset walk state, go to success screen
      if (data.wa_link) setParentWaLink(data.wa_link)
      if (data.report_url) setReportUrl(data.report_url)
      setMood('')
      setNotes('')
      setPhotoUrl(null)
      setElapsed(0)
      setDistanceKm(0)
      setGpsRoute([])
      setWalkEvents([])
      setPhase('success')
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

  // Derived counts for during-walk display
  const livePeeCount = walkEvents.filter(ev => ev.type === 'pee').length
  const livePoopCount = walkEvents.filter(ev => ev.type === 'poop').length

  // Poop photos from walk events
  const poopPhotos = walkEvents.filter(ev => ev.type === 'poop' && ev.photoUrl)

  return (
    <div className="min-h-screen pb-24" style={{ background: '#FFFBEB', fontFamily: 'var(--font-nunito), sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#0A2F35] text-white rounded-2xl px-5 py-4 text-sm font-semibold text-center shadow-xl animate-bounce-once"
          style={{ fontFamily: 'var(--font-nunito)' }}>
          {toast}
        </div>
      )}

      {/* Hidden poop photo input (used during walk) */}
      <input
        ref={poopPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePoopPhotoCapture}
      />

      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <span className="text-xl font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
          PupStep 🐾
        </span>
        <span className="text-sm text-slate-500" style={{ fontFamily: 'var(--font-nunito)' }}>
          Hi, {walkerName}
        </span>
      </div>

      {/* Tab content */}
      {activeTab === 'walk' && (
        <>
          {/* Dog card */}
          <div className="mx-5 mb-5 rounded-2xl bg-white border border-slate-100 px-4 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden"
              style={{ background: '#FF8C52' }}>
              {dogPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dogPhotoUrl} alt={dogName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🐕</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 font-medium">You&apos;re walking</p>
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
              {/* First-time save notice */}
              {showSaveNotice && (
                <div
                  className="rounded-2xl px-4 py-4 flex gap-3 items-start"
                  style={{ background: '#F0FDFA', border: '1.5px solid #99F6E4' }}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0D9488] mb-0.5" style={{ fontFamily: 'var(--font-fredoka)' }}>
                      Save your dashboard link
                    </p>
                    <p className="text-xs text-teal-700 mb-3 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                      Your client will send you this link on WhatsApp. Tap the button below to save it yourself too.
                    </p>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`My PupStep dashboard for ${dogName} 🐾\nTap to log walks:\n${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={dismissSaveNotice}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                      style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', textDecoration: 'none' }}
                    >
                      📲 Save my dashboard link
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={dismissSaveNotice}
                    className="text-teal-400 hover:text-teal-600 flex-shrink-0 text-lg leading-none"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}

              {healthNotes && (
                <div style={{
                  background: '#FFF7ED',
                  border: '1.5px solid #FED7AA',
                  borderRadius: 14,
                  padding: '12px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                  <div>
                    <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: '#92400E', margin: '0 0 3px' }}>
                      Health notes from owner
                    </p>
                    <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#B45309', margin: 0, lineHeight: 1.5 }}>
                      {healthNotes}
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={startWalk}
                className="w-full py-5 rounded-2xl font-bold text-2xl text-white shadow-lg active:scale-[0.97] transition-transform"
                style={{ background: 'linear-gradient(135deg, #FF8C52 0%, #F07030 100%)', fontFamily: 'var(--font-fredoka)' }}
              >
                🐾 Start Walk
              </button>
              <p className="text-center text-xs text-slate-400">GPS tracking starts automatically when you begin</p>

              {/* First-time guide card — only shown before any walks are logged */}
              {logs.length === 0 && !logsLoading && (
                <div
                  className="rounded-2xl px-5 py-5 mt-2"
                  style={{ background: '#FFF3E0' }}
                >
                  <p
                    className="font-bold text-[#0A2F35] text-base mb-4"
                    style={{ fontFamily: 'var(--font-fredoka)' }}
                  >
                    How to log a walk 👇
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">🟠</span>
                      <p className="text-xs font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Tap Start Walk
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        When you leave home
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">📍</span>
                      <p className="text-xs font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Walk as normal
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        GPS tracks your route automatically
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">✅</span>
                      <p className="text-xs font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Tap End Walk
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Fill in a quick 60-sec report
                      </p>
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-amber-600 font-semibold mt-4"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    The owner gets a report on WhatsApp automatically
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── WALKING PHASE ─── */}
          {phase === 'walking' && (
            <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
              {/* ── Live map — top 46vh ── */}
              <div className="relative w-full flex-shrink-0" style={{ height: '46vh' }}>
                {/* Derive map event arrays from walkEvents */}
                {(() => {
                  const poopEventsForMap = walkEvents.filter(e => e.type === 'poop' && e.lat != null && e.lng != null) as { lat: number; lng: number; ts: string }[]
                  const peeEventsForMap = walkEvents.filter(e => e.type === 'pee' && e.lat != null && e.lng != null) as { lat: number; lng: number; ts: string }[]
                  return (
                    <LiveMap
                      currentPos={currentPos}
                      routePointsRef={routePointsRef}
                      poopEvents={poopEventsForMap}
                      peeEvents={peeEventsForMap}
                    />
                  )
                })()}

                {/* Back button — floating top-left */}
                <button
                  onClick={() => setPhase('idle')}
                  className="absolute top-4 left-4 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-white shadow-md text-gray-700 active:opacity-60 transition-opacity"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  ← Back
                </button>

                {/* Poop/pee live counts — floating top-right */}
                <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white bg-opacity-90 rounded-full px-3 py-1.5 shadow-md">
                  <span className="text-sm font-bold text-gray-700">💩 {livePoopCount}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-sm font-bold text-gray-700">💧 {livePeeCount}</span>
                </div>

                {/* Timer + distance HUD — floating bottom of map */}
                <div
                  className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between px-4 py-3"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)' }}
                >
                  <div>
                    <p className="text-3xl font-bold text-white tabular-nums tracking-tight leading-none"
                      style={{ fontFamily: 'var(--font-fredoka)' }}>
                      {formatElapsed(elapsed)}
                    </p>
                    <p className="text-sm font-semibold text-white/80 mt-0.5">{distanceKm.toFixed(2)} km</p>
                  </div>
                </div>

                {/* GPS error overlay */}
                {gpsError && (
                  <div className="absolute top-14 left-4 right-4 z-10 px-3 py-2 rounded-xl text-xs text-amber-800 text-center"
                    style={{ background: '#FFFBEB', border: '1px solid #FED7AA' }}>
                    ⚠️ {gpsError}
                  </div>
                )}

                {/* Getting GPS spinner */}
                {!currentPos && !gpsError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <p className="text-sm">Getting GPS…</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Controls — bottom section ── */}
              <div className="flex-1 flex flex-col px-5 pt-4 pb-6 gap-3" style={{ background: '#FFFBEB' }}>
                {/* Keep screen open banner */}
                <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                  style={{ background: 'oklch(0.97 0.02 196)', border: '1px solid oklch(0.88 0.06 196)' }}>
                  <span className="text-base flex-shrink-0">📱</span>
                  <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: 'oklch(0.40 0.17 196)', margin: 0, fontWeight: 600 }}>
                    Keep this screen open during the walk to track GPS
                  </p>
                </div>

                {/* Walk started — notify parent prompt */}
                {startWaLink && elapsed < 120 && (
                  <a
                    href={startWaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 no-underline"
                    style={{ background: '#25D366' }}
                  >
                    <span className="text-xl">📲</span>
                    <div>
                      <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
                        Notify {ownerFirstName} walk has started
                      </p>
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                        Tap to send a WhatsApp message
                      </p>
                    </div>
                  </a>
                )}

                {/* Pee / Poop tap buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Toilet button */}
                  <button
                    type="button"
                    onClick={handlePeeTap}
                    className="rounded-2xl border-2 border-blue-200 bg-blue-50 flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-transform"
                    style={{ minHeight: 80 }}
                  >
                    <span className="text-3xl">💧</span>
                    <span className="text-sm font-bold text-blue-700" style={{ fontFamily: 'var(--font-fredoka)' }}>
                      Toilet 💧
                    </span>
                    {livePeeCount > 0 && (
                      <span className="text-xs font-bold text-blue-500 bg-blue-100 rounded-full px-2 py-0.5">
                        💧 {livePeeCount}
                      </span>
                    )}
                  </button>

                  {/* Potty button */}
                  <button
                    type="button"
                    onClick={handlePoopTap}
                    className="rounded-2xl border-2 border-amber-200 bg-amber-50 flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-transform"
                    style={{ minHeight: 80 }}
                  >
                    <span className="text-3xl">💩</span>
                    <span className="text-sm font-bold text-amber-700" style={{ fontFamily: 'var(--font-fredoka)' }}>
                      Potty + Photo 💩
                    </span>
                    {livePoopCount > 0 && (
                      <span className="text-xs font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
                        💩 {livePoopCount}
                        {poopPhotoUploading && ' ⏳'}
                      </span>
                    )}
                  </button>
                </div>

                {/* Poop photo thumbnails strip */}
                {poopPhotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {poopPhotos.map((ev, i) => (
                      ev.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={ev.photoUrl}
                          alt={`Poop photo ${i + 1}`}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow"
                        />
                      ) : null
                    ))}
                  </div>
                )}

                {/* End Walk button */}
                <div className="mt-auto">
                  <button
                    onClick={endWalk}
                    className="w-full py-4 rounded-2xl font-bold text-xl text-white shadow-md active:scale-[0.97] transition-transform"
                    style={{ background: '#DC2626', fontFamily: 'var(--font-fredoka)' }}
                  >
                    End Walk
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── LOGGING PHASE ─── */}
          {phase === 'logging' && (
            <div className="px-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* A) Walk summary card */}
                {(() => {
                  const finalPoopCount = walkEvents.filter(e => e.type === 'poop').length
                  const finalPeeCount = walkEvents.filter(e => e.type === 'pee').length
                  return (
                    <div style={{ background: 'oklch(0.94 0.06 196)', borderRadius: 16, padding: '14px 16px' }}>
                      <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: 'oklch(0.40 0.17 196)', margin: '0 0 6px' }}>
                        This walk summary
                      </p>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>⏱ {Math.floor(elapsed / 60)} min</span>
                        {distanceKm > 0 && <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>📍 {distanceKm.toFixed(1)} km</span>}
                        {finalPoopCount > 0 && <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>💩 {finalPoopCount} potty</span>}
                        {finalPeeCount > 0 && <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>💧 {finalPeeCount} toilet</span>}
                      </div>
                    </div>
                  )
                })()}

                {/* B) Dog photo */}
                <div>
                  <label className="block text-sm font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                    Take a photo of {dogName} 📸
                  </label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                  {photoUrl ? (
                    <div className="relative w-full rounded-xl overflow-hidden" style={{ maxHeight: 220 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl} alt="Walk photo" className="w-full object-cover rounded-xl" style={{ maxHeight: 220 }} />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(null)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black bg-opacity-50 text-white text-sm flex items-center justify-center"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 transition-colors disabled:opacity-60"
                      style={{ borderColor: 'oklch(0.70 0.13 196)', color: 'oklch(0.48 0.17 196)' }}
                    >
                      <span className="text-3xl">{uploading ? '⏳' : '📷'}</span>
                      <span className="text-sm font-bold">{uploading ? 'Uploading…' : 'Tap to take a photo'}</span>
                    </button>
                  )}
                </div>

                {/* C) Mood — 3 big emoji buttons */}
                <div>
                  <label className="block text-sm font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                    How was {dogName}?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {MOOD_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => setMood(mood === opt.value ? '' : opt.value)}
                        className="flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-[0.97]"
                        style={{
                          borderColor: mood === opt.value ? 'oklch(0.48 0.17 196)' : '#E2E8F0',
                          background: mood === opt.value ? 'oklch(0.95 0.04 196)' : '#fff',
                          color: mood === opt.value ? 'oklch(0.40 0.17 196)' : '#64748B',
                        }}>
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-fredoka)' }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* D) Notes — small, optional */}
                <div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything to tell the owner? (optional)"
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-none"
                    style={{ outlineColor: 'oklch(0.48 0.17 196)' }}
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
                  {submitting ? 'Sending report…' : `Send to ${ownerFirstName} ✓`}
                </button>
              </form>
            </div>
          )}

          {/* ─── SUCCESS PHASE ─── */}
          {phase === 'success' && (
            <div className="px-5 flex flex-col items-center text-center pt-8 pb-24">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-3xl font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                Report ready!
              </h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed px-4" style={{ fontFamily: 'var(--font-nunito)' }}>
                {ownerFirstName
                  ? `Great walk! Send ${ownerFirstName} the report link below.`
                  : `Walk logged successfully! 🐾`}
              </p>

              {/* Report link card */}
              {reportUrl && (
                <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-5 shadow-sm text-left">
                  <p className="text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wide">Walk report link</p>
                  <p className="text-sm font-medium text-[#0A2F35] break-all leading-snug">{reportUrl}</p>
                </div>
              )}

              <div className="w-full max-w-sm space-y-3">
                {/* Send to owner via WhatsApp (includes report URL) */}
                {parentWaLink && (
                  <a
                    href={parentWaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-base shadow-md"
                    style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', fontSize: '17px' }}
                  >
                    📲 Send report to {ownerFirstName ?? 'owner'}
                  </a>
                )}

                {/* View the report */}
                {reportUrl && (
                  <a
                    href={reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-base border-2"
                    style={{ borderColor: 'oklch(0.48 0.17 196)', color: 'oklch(0.48 0.17 196)', fontFamily: 'var(--font-fredoka)' }}
                  >
                    👁 View report →
                  </a>
                )}

                {/* Save dashboard link to WhatsApp */}
                {(() => {
                  const dashUrl = typeof window !== 'undefined'
                    ? `${window.location.origin}/walker/${token}`
                    : `https://pupstep.in/walker/${token}`
                  const waText = encodeURIComponent(
                    `My PupStep walker dashboard for ${dogName} 🐾\nReturn here anytime:\n${dashUrl}`
                  )
                  return (
                    <div className="rounded-2xl border-2 px-4 py-4 text-center"
                      style={{ borderColor: 'oklch(0.88 0.06 196)', background: 'oklch(0.97 0.02 196)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: 'oklch(0.40 0.17 196)', fontFamily: 'var(--font-fredoka)' }}>
                        📌 Save your dashboard link
                      </p>
                      <p className="text-xs text-slate-500 mb-3" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Bookmark this page or send the link to yourself — you need it to log future walks
                      </p>
                      <a
                        href={`https://wa.me/?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm"
                        style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)' }}
                      >
                        📲 Send link to myself on WhatsApp
                      </a>
                    </div>
                  )
                })()}

                <button
                  onClick={() => { setPhase('idle'); setReportUrl(null); setParentWaLink(null) }}
                  className="w-full py-4 rounded-2xl font-bold text-lg text-white"
                  style={{ background: '#FF8C52', fontFamily: 'var(--font-fredoka)' }}
                >
                  Log another walk →
                </button>
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
                              {MOOD_OPTIONS.find((m) => m.value === log.mood)?.emoji ?? '🐕'}
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
                        <span>💩 Potty: {log.poop_count}</span>
                        <span>💧 Toilet: {log.pee_count}</span>
                        {log.mood && <span className="capitalize text-slate-400">{log.mood}</span>}
                      </div>
                      {log.notes && (
                        <p className="text-xs text-slate-400 mt-2 italic">&ldquo;{log.notes}&rdquo;</p>
                      )}
                      <p className="text-xs text-slate-300 mt-2">✅ Report sent to owner</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Bookmark hint */}
              <div className="mt-6 rounded-2xl bg-[#0A2F35] bg-opacity-5 border border-[#0A2F35] border-opacity-10 px-4 py-3 text-center">
                <p className="text-xs text-[#0D3D45] font-medium">📌 Bookmark this page — it&apos;s your permanent walk log</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── GROOMING TAB ─── */}
      {activeTab === 'grooming' && (
        <div className="px-5 pt-2">
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-8 text-center">
            <span className="text-4xl">✂️</span>
            <h2 className="font-bold text-[#0A2F35] text-xl mt-3 mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
              Grooming Log
            </h2>
            <p className="text-sm text-slate-400">Grooming log coming soon</p>
          </div>
        </div>
      )}

      {/* ─── SETTINGS TAB ─── */}
      {activeTab === 'settings' && (
        <div className="px-5 pt-2 space-y-4">
          {/* Walker name card */}
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Walker</p>
            <p className="text-xl font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
              {walkerName}
            </p>
          </div>

          {/* Save dashboard link */}
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Save your dashboard link</p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`My PupStep dashboard for ${dogName}: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-base shadow-md"
              style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)' }}
            >
              📲 Send link to myself on WhatsApp
            </a>
            <p className="text-xs text-slate-400 text-center">
              📌 Bookmark this page in your browser so you can always come back
            </p>
          </div>

          {/* Owner contact */}
          {ownerPhone && (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Owner contact</p>
              <a
                href={`tel:+91${ownerPhone.replace(/\D/g, '')}`}
                className="flex items-center gap-3 py-3 px-4 rounded-xl border-2 font-bold text-[#0A2F35] active:bg-slate-50 transition-colors"
                style={{ borderColor: 'oklch(0.48 0.17 196)', fontFamily: 'var(--font-fredoka)' }}
              >
                <span className="text-xl">📞</span>
                <span>Contact {ownerFirstName}</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* ─── BOTTOM NAV ─── */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t flex"
        style={{
          borderColor: 'oklch(0.906 0.06 88)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 40,
        }}
      >
        {(
          [
            { tab: 'walk' as WalkerTab, icon: '🐾', label: 'Walk' },
            { tab: 'grooming' as WalkerTab, icon: '✂️', label: 'Grooming' },
            { tab: 'settings' as WalkerTab, icon: '⚙️', label: 'Settings' },
          ] as const
        ).map(({ tab, icon, label }) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors"
          >
            <span
              className={`flex flex-col items-center justify-center rounded-full px-4 py-1.5 gap-0.5 transition-all ${
                activeTab === tab ? 'bg-teal-50' : ''
              }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span
                className={`text-[11px] font-bold leading-none ${
                  activeTab === tab ? 'text-[oklch(0.48_0.17_196)]' : 'text-slate-400'
                }`}
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {label}
              </span>
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
