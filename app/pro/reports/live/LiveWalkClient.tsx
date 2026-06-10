'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type WalkState = 'ready' | 'walking' | 'summary' | 'done'

type GeoEvent = {
  lat: number
  lng: number
  time: string
}

function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(2)} km`
}

const fadeVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } },
}

// ── Live map shown to provider during walk ────────────────────────────────
function LiveMap({
  currentPos,
  routePointsRef,
  poopEvents,
  peeEvents,
}: {
  currentPos: { lat: number; lng: number } | null
  routePointsRef: React.RefObject<{ lat: number; lng: number }[]>
  poopEvents: GeoEvent[]
  peeEvents: GeoEvent[]
}) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)
  const posMarkerRef = useRef<any>(null)
  const eventMarkersRef = useRef<any[]>([])

  useEffect(() => {
    function initMap() {
      if (!mapDivRef.current) return
      const center = currentPos ?? { lat: 19.098, lng: 72.827 } // Juhu default
      const gm = (window as any).google.maps

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

    if ((window as any).google?.maps) {
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

  // Add poop/pee markers when new events arrive
  useEffect(() => {
    if (!mapRef.current) return
    const gm = (window as any).google?.maps
    if (!gm) return

    // Clear old markers
    eventMarkersRef.current.forEach(m => m.setMap(null))
    eventMarkersRef.current = []

    const allEvents = [
      ...poopEvents.map(e => ({ ...e, emoji: '💩' })),
      ...peeEvents.map(e => ({ ...e, emoji: '💧' })),
    ]

    allEvents.forEach(evt => {
      const marker = new gm.Marker({
        position: { lat: evt.lat, lng: evt.lng },
        map: mapRef.current,
        label: { text: evt.emoji, fontSize: '16px' },
        icon: { path: gm.SymbolPath.CIRCLE, scale: 0 }, // invisible base, emoji label only
      })
      eventMarkersRef.current.push(marker)
    })
  }, [poopEvents, peeEvents])

  return <div ref={mapDivRef} className="w-full h-full" />
}

export default function LiveWalkClient({
  providerId,
  providerName,
}: {
  providerId: string
  providerName: string
}) {
  const router = useRouter()

  const [walkState, setWalkState] = useState<WalkState>('ready')
  const [elapsed, setElapsed] = useState(0)
  const [distance, setDistance] = useState(0)
  const [poopEvents, setPoopEvents] = useState<GeoEvent[]>([])
  const [peeEvents, setPeeEvents] = useState<GeoEvent[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [dogName, setDogName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [reportToken, setReportToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null)

  const routePointsRef = useRef<{ lat: number; lng: number }[]>([])
  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  // Wall-clock start time — survives JS pauses when screen locks
  const startTimeRef = useRef<number>(0)
  // Screen Wake Lock — keeps screen on so GPS never pauses
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // Acquire wake lock — call on walk start and on visibility restore
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // Silently fail — user sees the banner prompt as fallback
    }
  }, [])

  // Re-acquire wake lock when user returns to the tab after screen-on
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && wakeLockRef.current?.released) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [requestWakeLock])

  // Ticker — recalculates from wall clock every second so screen-lock gaps are bridged
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (walkState !== 'walking') return
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [walkState])

  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device.')
      return
    }

    startTimeRef.current = Date.now()
    setWalkState('walking')
    setElapsed(0)
    setDistance(0)
    setPoopEvents([])
    setPeeEvents([])
    setPhotos([])
    routePointsRef.current = []

    // Request wake lock — prevents screen from locking mid-walk
    await requestWakeLock()

    // Start GPS
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        routePointsRef.current.push(point)
        setCurrentPos(point)
        if (routePointsRef.current.length >= 2) {
          const prev = routePointsRef.current[routePointsRef.current.length - 2]
          setDistance((d) => d + haversineDistance(prev, point))
        }
      },
      (err) => {
        console.warn('GPS error:', err)
        setGpsError('GPS signal lost. Walk data may be incomplete.')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }, [requestWakeLock])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    // Release wake lock — screen can sleep again after walk ends
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  function recordEvent(type: 'poop' | 'pee') {
    const lastPoint = routePointsRef.current[routePointsRef.current.length - 1]
    if (!lastPoint) return
    const event: GeoEvent = {
      lat: lastPoint.lat,
      lng: lastPoint.lng,
      time: new Date().toISOString(),
    }
    if (type === 'poop') setPoopEvents((e) => [...e, event])
    else setPeeEvents((e) => [...e, event])
  }

  function handleEndWalk() {
    const confirmed = window.confirm('End this walk? You will fill in the report next.')
    if (!confirmed) return
    stopTracking()
    setWalkState('summary')
  }

  function handleBack() {
    const confirmed = window.confirm('Go back? The current walk will be lost.')
    if (!confirmed) return
    stopTracking()
    setWalkState('ready')
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const supabase = createClient()
      const path = `${providerId}/${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('walk-report-photos')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw error
      const { data: urlData } = supabase.storage
        .from('walk-report-photos')
        .getPublicUrl(path)
      setPhotos((p) => [...p, urlData.publicUrl])
    } catch (err) {
      console.error('Photo upload error:', err)
      alert('Photo upload failed. Please try again.')
    } finally {
      setUploadingPhoto(false)
      // Reset file input so same file can be re-selected
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  async function handleGenerateReport() {
    if (!dogName.trim()) {
      alert("Please enter the dog's name.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/walk-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dog_name: dogName.trim(),
          duration_mins: Math.floor(elapsed / 60),
          poop_count: poopEvents.length,
          pee_count: peeEvents.length,
          notes: notes.trim() || null,
          photo_url: photos[0] ?? null,
          route_points: routePointsRef.current,
          distance_meters: distance,
          poop_events: poopEvents,
          pee_events: peeEvents,
          start_location: '',
          end_location: '',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save report')
      setReportToken(json.token)
      setWalkState('done')
    } catch (err) {
      console.error(err)
      alert('Could not save report. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function handleReset() {
    setWalkState('ready')
    setElapsed(0)
    setDistance(0)
    setPoopEvents([])
    setPeeEvents([])
    setPhotos([])
    setDogName('')
    setNotes('')
    setReportToken('')
    setCopied(false)
    routePointsRef.current = []
  }

  const shareUrl = `https://pupstep.in/walk-report/${reportToken}`
  const whatsappText = encodeURIComponent(
    `Here is ${dogName ? `${dogName}'s` : "your dog's"} walk report from PawLocal! 🐾\n${shareUrl}`
  )

  return (
    <div className="min-h-dvh pb-24" style={{ background: 'oklch(0.975 0.006 85)' }}>
      <AnimatePresence mode="wait">
        {/* ─────────────── READY ─────────────── */}
        {walkState === 'ready' && (
          <motion.div
            key="ready"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center justify-center min-h-dvh px-6 pb-24"
          >
            <div className="bg-white rounded-3xl shadow-xl px-8 py-10 flex flex-col items-center gap-5 w-full max-w-sm">
              <span className="text-6xl select-none">🐾</span>
              <h1 className="text-2xl font-bold text-gray-900 text-center">
                Ready to Walk?
              </h1>
              <p className="text-sm text-gray-500 text-center leading-relaxed">
                This screen will track the route, distance, and events during the
                walk. <strong>GPS will be used</strong> throughout the session.
              </p>
              {gpsError && (
                <p className="text-xs text-red-500 text-center">{gpsError}</p>
              )}
              <button
                onClick={startTracking}
                className="w-full py-4 rounded-2xl text-white font-semibold text-lg shadow-md active:scale-95 transition-transform"
                style={{ background: 'oklch(0.48 0.17 196)' }}
              >
                Start Walk
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────── WALKING ─────────────── */}
        {walkState === 'walking' && (
          <motion.div
            key="walking"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col min-h-dvh"
          >
            {/* ── Live map — takes top half of screen ── */}
            <div className="relative w-full" style={{ height: '46vh' }}>
              <LiveMap
                currentPos={currentPos}
                routePointsRef={routePointsRef}
                poopEvents={poopEvents}
                peeEvents={peeEvents}
              />

              {/* Back button — floating top-left */}
              <button
                onClick={handleBack}
                className="absolute top-4 left-4 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-white shadow-md text-gray-700 active:opacity-60 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              {/* Timer + distance HUD — floating bottom of map */}
              <div className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between px-4 py-3"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)' }}>
                <div>
                  <p className="text-3xl font-bold text-white tabular-nums tracking-tight leading-none"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    {formatTime(elapsed)}
                  </p>
                  <p className="text-sm font-semibold text-white/80 mt-0.5">{formatDistance(distance)}</p>
                </div>
                <div className="flex gap-3 text-white text-sm font-bold">
                  <span>💩 {poopEvents.length}</span>
                  <span>💧 {peeEvents.length}</span>
                </div>
              </div>

              {/* GPS error */}
              {gpsError && (
                <div className="absolute top-14 left-4 right-4 z-10 px-3 py-2 rounded-xl text-xs text-amber-800 text-center"
                  style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                  {gpsError}
                </div>
              )}

              {/* No GPS yet — waiting indicator */}
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

              {/* Wake lock fallback */}
              {typeof window !== 'undefined' && !('wakeLock' in navigator) && (
                <div className="absolute top-14 left-4 right-4 z-10 px-3 py-2 rounded-xl text-xs text-amber-800 text-center"
                  style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                  🔆 Keep your screen on for accurate GPS tracking
                </div>
              )}
            </div>

            {/* ── Controls — bottom half ── */}
            <div className="flex-1 flex flex-col px-4 pt-4 pb-6 gap-3" style={{ background: 'oklch(0.975 0.006 85)' }}>

              {/* Poop / Pee buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => recordEvent('poop')}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white py-4 shadow-sm active:scale-95 transition-transform border border-gray-100"
                >
                  <span className="text-3xl select-none">💩</span>
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Poop
                    {poopEvents.length > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] text-white font-bold"
                        style={{ background: 'oklch(0.48 0.17 196)' }}>
                        {poopEvents.length}
                      </span>
                    )}
                  </span>
                </button>

                <button
                  onClick={() => recordEvent('pee')}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white py-4 shadow-sm active:scale-95 transition-transform border border-gray-100"
                >
                  <span className="text-3xl select-none">💧</span>
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Pee
                    {peeEvents.length > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] text-white font-bold"
                        style={{ background: 'oklch(0.48 0.17 196)' }}>
                        {peeEvents.length}
                      </span>
                    )}
                  </span>
                </button>
              </div>

              {/* Photo button */}
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                  id="photo-input"
                />
                <label
                  htmlFor="photo-input"
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed font-medium text-sm transition-all active:scale-95 cursor-pointer ${
                    uploadingPhoto
                      ? 'border-gray-300 text-gray-400 bg-gray-50'
                      : 'border-teal-400 text-teal-700 bg-teal-50 active:bg-teal-100'
                  }`}
                >
                  {uploadingPhoto ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Uploading…
                    </>
                  ) : (
                    <>
                      <span className="text-base">📸</span>
                      {photos.length > 0 ? `Photo added (${photos.length})` : 'Take Photo'}
                    </>
                  )}
                </label>

                {photos.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {photos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt={`Walk photo ${i + 1}`}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow" />
                    ))}
                  </div>
                )}
              </div>

              {/* End Walk */}
              <div className="mt-auto">
                <button
                  onClick={handleEndWalk}
                  className="w-full py-4 rounded-2xl text-white font-semibold text-base shadow-md active:scale-95 transition-transform bg-rose-500"
                >
                  End Walk
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────── SUMMARY ─────────────── */}
        {walkState === 'summary' && (
          <motion.div
            key="summary"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col min-h-dvh px-5 pt-safe"
          >
            {/* Header */}
            <div className="py-5">
              <h1 className="text-2xl font-bold text-gray-900">Walk Summary</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Great work, {providerName.split(' ')[0]}! Fill in the details below.
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { label: 'Time', value: formatTime(elapsed) },
                { label: 'Distance', value: formatDistance(distance) },
                { label: 'Poops', value: `💩 ${poopEvents.length}` },
                { label: 'Pees', value: `💧 ${peeEvents.length}` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl p-3 flex flex-col items-center shadow-sm border border-gray-100"
                >
                  <span className="text-base font-bold text-gray-900 tabular-nums">{value}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">{label}</span>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4 pb-8">
              {/* Dog name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Dog Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={dogName}
                  onChange={(e) => setDogName(e.target.value)}
                  placeholder="e.g. Bruno"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did the walk go? Any behaviour to note?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Photos */}
              {photos.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Photos ({photos.length})
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {photos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt={`Walk photo ${i + 1}`}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0 shadow"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Generate report */}
              <button
                onClick={handleGenerateReport}
                disabled={saving || !dogName.trim()}
                className="w-full py-4 rounded-2xl text-white font-semibold text-lg shadow-md active:scale-95 transition-all mt-2 disabled:opacity-50 disabled:active:scale-100"
                style={{ background: 'oklch(0.48 0.17 196)' }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </span>
                ) : (
                  'Generate Report'
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────── DONE ─────────────── */}
        {walkState === 'done' && (
          <motion.div
            key="done"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center justify-center min-h-dvh px-6 pb-24"
          >
            <div className="bg-white rounded-3xl shadow-xl px-7 py-10 flex flex-col items-center gap-5 w-full max-w-sm">
              {/* Success icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-md"
                style={{ background: 'oklch(0.48 0.17 196)' }}
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Report Ready!</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Share this link with {dogName ? `${dogName}'s` : "the dog's"} owner.
                </p>
              </div>

              {/* Link box */}
              <div className="w-full bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <p className="text-xs text-gray-400 mb-0.5">Shareable link</p>
                <p className="text-sm font-medium text-gray-800 break-all leading-snug">
                  {shareUrl}
                </p>
              </div>

              {/* Copy */}
              <button
                onClick={handleCopy}
                className={`w-full py-3.5 rounded-2xl font-semibold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl font-semibold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 text-white"
                style={{ background: '#25D366' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.845L.057 23.428a.5.5 0 00.609.61l5.64-1.476A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.91 0-3.698-.5-5.244-1.373l-.375-.217-3.888 1.018 1.034-3.774-.237-.389A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
                Share on WhatsApp
              </a>

              {/* View report */}
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium underline underline-offset-2"
                style={{ color: 'oklch(0.48 0.17 196)' }}
              >
                View Report →
              </a>

              {/* Log another */}
              <button
                onClick={handleReset}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
              >
                Log another walk
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
