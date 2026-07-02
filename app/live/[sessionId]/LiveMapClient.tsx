'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/* ─── Types ──────────────────────────────────────────────────── */
interface SessionData {
  id: string
  pet_name: string | null
  customer_name: string | null
  status: 'active' | 'completed'
  started_at: string
  ended_at: string | null
  distance_km: number | null
  current_lat: number | null
  current_lng: number | null
}

interface LatLng {
  lat: number
  lng: number
}

interface Props {
  sessionId: string
  session: SessionData
}

/* ─── Constants ──────────────────────────────────────────────── */
const JUHU_CENTER: LatLng = { lat: 19.1075, lng: 72.8263 }

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ saturation: -30 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f0ece4' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#e8e0d5' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ddd5c8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e4f0' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d4edda' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]

/* ─── Helpers ────────────────────────────────────────────────── */
function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  const diffSec = Math.floor((end - start) / 1000)
  const h = Math.floor(diffSec / 3600)
  const m = Math.floor((diffSec % 3600) / 60)
  const s = diffSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatDistance(km: number | null): string {
  if (km === null) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(2)} km`
}

/* ─── Pulsing live dot (CSS-in-JS via style tag) ─────────────── */
const PULSE_STYLE = `
  @keyframes pupstep-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.4); opacity: 0.5; }
  }
  .ps-live-dot {
    animation: pupstep-pulse 1.5s ease-in-out infinite;
  }
`

/* ─── Component ──────────────────────────────────────────────── */
export default function LiveMapClient({ sessionId, session }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const mapsLoadedRef = useRef(false)

  const [locations, setLocations] = useState<LatLng[]>([])
  const [currentPos, setCurrentPos] = useState<LatLng | null>(
    session.current_lat !== null && session.current_lng !== null
      ? { lat: session.current_lat, lng: session.current_lng }
      : null
  )
  const [elapsed, setElapsed] = useState(() => formatDuration(session.started_at, session.ended_at))
  const [distance, setDistance] = useState<number | null>(session.distance_km)
  const [mapsReady, setMapsReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  /* ── Load Google Maps script ─────────────────────────────── */
  useEffect(() => {
    if (mapsLoadedRef.current) return
    if (typeof window === 'undefined') return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) {
      console.error('[LiveMap] NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set')
      return
    }

    // If already loaded by another instance
    if (window.google?.maps) {
      mapsLoadedRef.current = true
      setMapsReady(true)
      return
    }

    const callbackName = '__pupstep_maps_cb__'
    ;(window as unknown as Record<string, unknown>)[callbackName] = () => {
      mapsLoadedRef.current = true
      setMapsReady(true)
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.id = 'google-maps-script'
    document.head.appendChild(script)

    return () => {
      // Don't remove — map stays loaded for navigation
    }
  }, [])

  /* ── Init map once Google Maps is ready ──────────────────── */
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || mapRef.current) return

    const center = currentPos ?? JUHU_CENTER

    const map = new google.maps.Map(mapDivRef.current, {
      center,
      zoom: 16,
      styles: MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER,
      },
    })
    mapRef.current = map

    // Custom dog walker marker (orange circle with paw emoji)
    if (currentPos) {
      const marker = new google.maps.Marker({
        position: currentPos,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#FF8C52',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: session.pet_name ? `${session.pet_name}'s walker` : 'Dog walker',
        zIndex: 10,
      })
      markerRef.current = marker
    }

    // Polyline (will be populated when locations load)
    const polyline = new google.maps.Polyline({
      path: [],
      geodesic: true,
      strokeColor: '#FF8C52',
      strokeOpacity: 0.85,
      strokeWeight: 4,
    })
    polyline.setMap(map)
    polylineRef.current = polyline
  }, [mapsReady, currentPos, session.pet_name])

  /* ── Update polyline path when locations change ──────────── */
  useEffect(() => {
    if (!polylineRef.current) return
    polylineRef.current.setPath(locations)
  }, [locations])

  /* ── Move marker when currentPos changes ─────────────────── */
  useEffect(() => {
    if (!mapRef.current || !currentPos) return

    if (markerRef.current) {
      markerRef.current.setPosition(currentPos)
    } else {
      // First position arrived — create marker now
      const marker = new google.maps.Marker({
        position: currentPos,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#FF8C52',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: session.pet_name ? `${session.pet_name}'s walker` : 'Dog walker',
        zIndex: 10,
      })
      markerRef.current = marker
    }

    // Pan map to new position
    mapRef.current.panTo(currentPos)
  }, [currentPos, session.pet_name])

  /* ── Load existing walk_locations on mount ───────────────── */
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function loadLocations() {
      const { data } = await supabase
        .from('walk_locations')
        .select('lat, lng, recorded_at')
        .eq('session_id', sessionId)
        .order('recorded_at', { ascending: true })

      if (cancelled || !data) return

      const pts: LatLng[] = data
        .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
        .map((r) => ({ lat: r.lat as number, lng: r.lng as number }))
      setLocations(pts)

      if (pts.length > 0) {
        const last = pts[pts.length - 1]
        setCurrentPos(last)
        if (mapRef.current) {
          mapRef.current.panTo(last)
        }
      }
      setLoading(false)
    }

    loadLocations()
    return () => { cancelled = true }
  }, [sessionId])

  /* ── Supabase Realtime for active walks ──────────────────── */
  useEffect(() => {
    if (session.status !== 'active') {
      setLoading(false)
      return
    }

    const supabase = createClient()

    const channel = supabase
      .channel(`walk:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'walk_locations',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const { lat, lng } = payload.new as { lat: number; lng: number; session_id: string }
          setLocations((prev) => [...prev, { lat, lng }])
          setCurrentPos({ lat, lng })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, session.status])

  /* ── Duration counter (updates every second for active walks) */
  useEffect(() => {
    setElapsed(formatDuration(session.started_at, session.ended_at))
    if (session.status !== 'active') return

    const interval = setInterval(() => {
      setElapsed(formatDuration(session.started_at, null))
    }, 1000)

    return () => clearInterval(interval)
  }, [session.started_at, session.ended_at, session.status])

  /* ── Share handler ───────────────────────────────────────── */
  const handleShare = useCallback(async () => {
    const url = window.location.href
    const title = session.pet_name
      ? `${session.pet_name}'s live walk on PupStep`
      : 'Live walk on PupStep'

    if (navigator.share) {
      try {
        await navigator.share({ url, title })
        return
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard blocked — silently ignore
    }
  }, [session.pet_name])

  const dogName = session.pet_name ?? 'Dog'
  const walkerName = session.customer_name ?? 'Walker'
  const isActive = session.status === 'active'
  const hasLocations = locations.length > 0

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <>
      {/* Inject pulse keyframes */}
      <style>{PULSE_STYLE}</style>

      <div
        className="flex flex-col"
        style={{
          width: '100dvw',
          height: '100dvh',
          background: '#FFFBEB',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ── Header bar ──────────────────────────────────────── */}
        <header
          style={{
            height: 56,
            flexShrink: 0,
            background: 'linear-gradient(135deg, #FF8C52 0%, #f97316 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 'env(safe-area-inset-top)',
            boxShadow: '0 2px 12px rgba(255,140,82,0.35)',
            position: 'relative',
            zIndex: 20,
          }}
        >
          {/* Left: logo + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 20 }}>🐾</span>
            <span
              className="font-heading font-bold"
              style={{ fontSize: 14, color: '#fff', letterSpacing: '0.01em' }}
            >
              Live Walk
            </span>
          </div>

          {/* Center: dog name */}
          <span
            className="font-heading font-bold"
            style={{
              fontSize: 16,
              color: '#fff',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
            }}
          >
            {dogName}&apos;s Walk
          </span>

          {/* Right: status badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)',
              borderRadius: 20,
              paddingLeft: 10,
              paddingRight: 10,
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            {isActive ? (
              <>
                <span
                  className="ps-live-dot"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#4ade80',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span
                  className="font-sans font-bold"
                  style={{ fontSize: 11, color: '#fff', letterSpacing: '0.03em' }}
                >
                  In progress
                </span>
              </>
            ) : (
              <>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.5)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span
                  className="font-sans font-bold"
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.03em' }}
                >
                  Completed
                </span>
              </>
            )}
          </div>
        </header>

        {/* ── Map area ─────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            minHeight: 0,
          }}
        >
          {/* The actual map div */}
          <div
            ref={mapDivRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              touchAction: 'none',
              overscrollBehavior: 'contain',
            }}
          />

          {/* Loading skeleton overlay */}
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #f5f0e8 25%, #ede8dc 50%, #f5f0e8 75%)',
                backgroundSize: '400% 400%',
                animation: 'shimmer 2s ease-in-out infinite',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                zIndex: 5,
              }}
            >
              <style>{`
                @keyframes shimmer {
                  0%   { background-position: 0% 50%; }
                  50%  { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
              `}</style>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(255,140,82,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                🐾
              </div>
              <p
                className="font-sans"
                style={{ color: '#9ca3af', fontSize: 14, fontWeight: 600 }}
              >
                Loading map…
              </p>
            </div>
          )}

          {/* "No GPS yet" overlay — shown when map is ready but no locations */}
          {mapsReady && !loading && !hasLocations && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 4,
                gap: 8,
              }}
            >
              <div
                style={{
                  background: 'rgba(255,251,235,0.92)',
                  borderRadius: 16,
                  padding: '14px 22px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>📍</span>
                <span
                  className="font-sans font-bold"
                  style={{ fontSize: 13, color: '#0A2F35' }}
                >
                  Waiting for walker&apos;s location…
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom info card ──────────────────────────────────── */}
        <div
          style={{
            background: '#fff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
            padding: '20px 20px',
            paddingBottom: `calc(20px + env(safe-area-inset-bottom))`,
            flexShrink: 0,
            zIndex: 20,
          }}
        >
          {/* Dog + walker names */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p
                className="font-heading font-bold"
                style={{ fontSize: 18, color: '#0A2F35', lineHeight: 1.2 }}
              >
                {dogName}
              </p>
              <p
                className="font-sans"
                style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}
              >
                with {walkerName}
              </p>
            </div>

            {/* Walk complete badge OR live pulse */}
            {!isActive ? (
              <span
                className="font-sans font-bold"
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  borderRadius: 20,
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 4,
                  paddingBottom: 4,
                  fontSize: 12,
                }}
              >
                ✅ Walk Complete
              </span>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#f0fdf4',
                  borderRadius: 20,
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingTop: 5,
                  paddingBottom: 5,
                }}
              >
                <span
                  className="ps-live-dot"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#22c55e',
                    display: 'inline-block',
                  }}
                />
                <span className="font-sans font-bold" style={{ fontSize: 11, color: '#16a34a' }}>
                  Live
                </span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 16,
            }}
          >
            {/* Duration */}
            <div
              style={{
                background: '#FFFBEB',
                borderRadius: 16,
                padding: '12px 14px',
              }}
            >
              <p className="font-sans" style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Duration
              </p>
              <p
                className="font-heading font-bold"
                style={{ fontSize: 20, color: '#0A2F35', marginTop: 2, letterSpacing: '-0.01em' }}
              >
                {elapsed}
              </p>
            </div>

            {/* Distance */}
            <div
              style={{
                background: '#FFFBEB',
                borderRadius: 16,
                padding: '12px 14px',
              }}
            >
              <p className="font-sans" style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Distance
              </p>
              <p
                className="font-heading font-bold"
                style={{ fontSize: 20, color: '#0A2F35', marginTop: 2, letterSpacing: '-0.01em' }}
              >
                {formatDistance(distance)}
              </p>
            </div>
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            style={{
              width: '100%',
              background: '#25D366',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              padding: '14px 20px',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
              transition: 'opacity 0.15s ease',
            }}
            onMouseDown={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')}
            onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
          >
            <span style={{ fontSize: 17 }}>💬</span>
            {copied ? 'Link copied!' : 'Share this walk'}
          </button>
        </div>
      </div>
    </>
  )
}
