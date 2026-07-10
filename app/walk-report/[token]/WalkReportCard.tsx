'use client'

import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'
import { loadGoogleMaps } from '@/lib/googleMapsLoader'
import { trackEvent } from '@/lib/analytics'
import { SNAP_MAP_STYLE } from '@/lib/snapMapStyle'

// ─── Types ────────────────────────────────────────────────────────────────────
type WalkReport = {
  id: string
  token: string
  customer_id?: string | null
  client_id?: string | null
  provider_id?: string | null
  dog_name: string
  walk_date: string
  duration_mins: number
  poop_count: number
  pee_count: number
  notes: string | null
  photo_url: string | null
  provider_name: string
  is_verified: boolean
  verification_tier: string
  start_location: string | null
  end_location: string | null
  route_points: { lat: number; lng: number }[] | null
  distance_meters: number | null
  poop_events: { lat: number; lng: number; time: string; photo_url?: string | null }[] | null
  pee_events: { lat: number; lng: number; time: string }[] | null
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const CLAY = [
  'inset 0 2px 0 rgba(255,255,255,0.92)',
  'inset 0 -3px 0 rgba(0,0,0,0.09)',
  '0 1px 0 rgba(0,0,0,0.05)',
  '0 6px 20px -4px rgba(10,47,53,0.12)',
  '0 24px 48px -8px rgba(10,47,53,0.08)',
].join(', ')
const CLAY_ORANGE = [
  'inset 0 2px 0 rgba(255,200,120,0.6)',
  'inset 0 -3px 0 rgba(180,60,0,0.22)',
  '0 4px 14px rgba(255,140,82,0.42)',
  '0 12px 28px rgba(255,140,82,0.18)',
].join(', ')

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(isoDate: string) {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return '' }
}
function formatTime(isoDate: string) {
  try {
    const d = new Date(isoDate)
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch { return '' }
}
function parseMood(notes: string | null) {
  if (!notes) return null
  const m = notes.match(/\[Mood:\s*([\S]+)\s+(\w+)\]/i)
  if (!m) return null
  return { emoji: m[1], label: m[2] }
}
function cleanupNotes(notes: string | null) {
  if (!notes) return ''
  return notes.replace(/\[Mood:[^\]]*\]/i, '').trim()
}

// ─── Count-up (unused after stats refactor but kept for safety) ───────────────
// function useCountUp removed — stats row now uses raw values directly

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function IconRoute() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5c1.4 0 2.5-1.1 2.5-2.5S18.9 14 17.5 14H6.5C5.1 14 4 12.9 4 11.5S5.1 9 6.5 9H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  )
}
function IconPaw() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="4.5" cy="6.5" r="2.5" />
      <circle cx="9" cy="3.5" r="2.5" />
      <circle cx="15" cy="3.5" r="2.5" />
      <circle cx="19.5" cy="6.5" r="2.5" />
      <path d="M17.34 14.86c-.87-1.02-1.6-1.89-2.48-2.91-.46-.54-1.05-1.08-1.75-1.32-.11-.04-.22-.07-.33-.09-.25-.04-.52-.04-.78-.04s-.53 0-.78.04c-.11.02-.22.05-.33.09-.7.24-1.29.78-1.75 1.32-.88 1.02-1.61 1.89-2.48 2.91-1.31 1.31-2.92 2.76-2.62 4.79.29 1.02 1.02 2.03 2.33 2.32.73.15 3.06-.44 5.54-.44h.18c2.48 0 4.81.58 5.54.44 1.31-.29 2.04-1.31 2.33-2.32.29-2.03-1.31-3.48-2.62-4.79z" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function IconPerson() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconWA() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.845L.057 23.428a.5.5 0 00.609.61l5.64-1.476A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.91 0-3.698-.5-5.244-1.373l-.375-.217-3.888 1.018 1.034-3.774-.237-.389A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  )
}

// ─── Paw burst ────────────────────────────────────────────────────────────────
function PawBurst() {
  const paws = [
    { x: 0, y: -75, r: -10, delay: 0, size: 22 },
    { x: 58, y: -48, r: 22, delay: 0.05, size: 18 },
    { x: 72, y: 18, r: 38, delay: 0.08, size: 20 },
    { x: 32, y: 74, r: -18, delay: 0.12, size: 17 },
    { x: -38, y: 70, r: 16, delay: 0.14, size: 19 },
    { x: -74, y: 14, r: -32, delay: 0.1, size: 17 },
    { x: -54, y: -50, r: 26, delay: 0.06, size: 21 },
  ]
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ top: '25%' }}>
      {paws.map((p, i) => (
        <motion.span key={i} className="absolute select-none" style={{ fontSize: p.size }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.2 }}
          animate={{ opacity: [0, 1, 1, 0], x: p.x, y: p.y, scale: [0.2, 1.1, 1, 0.75], rotate: p.r }}
          transition={{ duration: 1.05, delay: p.delay, ease: [0.25, 0.46, 0.45, 0.94] }}>
          🐾
        </motion.span>
      ))}
    </div>
  )
}

// ─── Poop stat with optional photo bottom sheet ───────────────────────────────
function PoopStat({ count, poopEvents }: {
  count: number
  poopEvents: { lat: number; lng: number; time: string; photo_url?: string | null }[]
}) {
  const [showPhotos, setShowPhotos] = useState(false)
  const photosWithImages = poopEvents.filter(e => e.photo_url)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => photosWithImages.length > 0 && setShowPhotos(true)}
          style={{ background: 'none', border: 'none', cursor: photosWithImages.length > 0 ? 'pointer' : 'default', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 26 }}>💩</span>
          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#92400E', margin: 0 }}>{count}</p>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 600, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Poop</p>
        </button>
        {photosWithImages.length > 0 && (
          <button
            onClick={() => setShowPhotos(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 700, color: 'oklch(0.48 0.17 196)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            View photos
          </button>
        )}
      </div>

      {/* Poop photos bottom sheet */}
      {showPhotos && (
        <>
          <div
            onClick={() => setShowPhotos(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, backdropFilter: 'blur(4px)' }}
          />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70, background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '75vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 20px)', boxShadow: '0 -8px 32px rgba(10,47,53,0.18)' }}>
            <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#0A2F35', margin: 0 }}>Poop Photos 💩</h3>
              <button onClick={() => setShowPhotos(false)} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {photosWithImages.map((e, i) => (
                <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: '#F9F6EF', border: '1px solid rgba(10,47,53,0.08)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.photo_url!} alt={`Poop ${i + 1}`} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '8px 12px' }}>
                    <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                      {new Date(e.time).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Remove GPS outlier points that create implausible jumps (e.g. a bad first
// fix right after location lock-on). A dog walk never exceeds ~15km/h, so any
// consecutive-point jump implying a much higher speed is almost certainly a
// GPS glitch, not real movement.
function cleanRoute(points: { lat: number; lng: number }[]): { lat: number; lng: number }[] {
  if (points.length < 3) return points
  const cleaned: { lat: number; lng: number }[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = cleaned[cleaned.length - 1]
    const curr = points[i]
    const dLat = curr.lat - prev.lat
    const dLng = curr.lng - prev.lng
    // Rough distance in meters (good enough for outlier detection at this scale)
    const distMeters = Math.sqrt(dLat * dLat + dLng * dLng) * 111000
    // Reject single-point jumps further than 150m from the previous accepted point
    // (typical GPS noise is under 30m; 150m in one reading is almost certainly bad)
    if (distMeters > 150 && i < points.length - 1) continue
    cleaned.push(curr)
  }
  return cleaned
}

// Rough flat-earth distance in meters — fine at the scale of a single walk
function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = a.lat - b.lat
  const dLng = a.lng - b.lng
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111000
}

type RawEvent = { lat: number; lng: number; time: string }
type EventCluster = { lat: number; lng: number; hasPoop: boolean; hasPee: boolean }

// A poop and a pee logged moments apart at the same spot (a dog marking
// territory, or sniffing then going) previously rendered as two markers
// stacked exactly on top of each other — the second one silently hid the
// first. Cluster events within ~6m into a single marker that shows
// everything that happened there instead.
function clusterEvents(poopEvents: RawEvent[], peeEvents: RawEvent[]): EventCluster[] {
  const all = [
    ...poopEvents.map(e => ({ ...e, kind: 'poop' as const })),
    ...peeEvents.map(e => ({ ...e, kind: 'pee' as const })),
  ]
  const clusters: EventCluster[] = []
  for (const e of all) {
    const near = clusters.find(c => distMeters(c, e) < 6)
    if (near) {
      if (e.kind === 'poop') near.hasPoop = true
      if (e.kind === 'pee') near.hasPee = true
    } else {
      clusters.push({ lat: e.lat, lng: e.lng, hasPoop: e.kind === 'poop', hasPee: e.kind === 'pee' })
    }
  }
  return clusters
}

// Returns the sub-path of `points` covering the first `fraction` (0–1) of its
// total length, with one interpolated point at the exact cutoff — used to
// animate the route drawing itself in on load.
function partialPath(points: { lat: number; lng: number }[], fraction: number): { lat: number; lng: number }[] {
  if (points.length < 2 || fraction >= 1) return points
  if (fraction <= 0) return [points[0]]

  const segLengths: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const d = distMeters(points[i - 1], points[i])
    segLengths.push(d)
    total += d
  }
  if (total === 0) return points

  const targetDist = total * fraction
  let covered = 0
  const out: { lat: number; lng: number }[] = [points[0]]
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i]
    if (covered + segLen >= targetDist) {
      const t = segLen > 0 ? (targetDist - covered) / segLen : 0
      const a = points[i]
      const b = points[i + 1]
      out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t })
      return out
    }
    covered += segLen
    out.push(points[i + 1])
  }
  return points
}

// ─── Google Maps ──────────────────────────────────────────────────────────────
function WalkMap({ routePoints, poopEvents, peeEvents, reducedMotion }: {
  routePoints: { lat: number; lng: number }[]
  poopEvents: { lat: number; lng: number; time: string }[]
  peeEvents: { lat: number; lng: number; time: string }[]
  reducedMotion?: boolean
}) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!routePoints?.length || !mapRef.current) return

    const cleanedRoutePoints = cleanRoute(routePoints)
    let rafId: number | null = null

    function initMap() {
      if (!mapRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gm = (window as any).google.maps
      const map = new gm.Map(mapRef.current, {
        zoom: 15,
        center: cleanedRoutePoints[0],
        disableDefaultUI: true,
        gestureHandling: 'cooperative',
        styles: SNAP_MAP_STYLE,
      })

      // Soft glow layer under the route — wider, translucent, same color.
      // Gives the line depth without turning it into a gradient/heatmap.
      const glow = new gm.Polyline({
        path: [cleanedRoutePoints[0]],
        strokeColor: 'oklch(0.48 0.17 196)',
        strokeWeight: 13,
        strokeOpacity: 0.18,
        geodesic: true,
        zIndex: 1,
      })
      glow.setMap(map)

      // Main route line
      const route = new gm.Polyline({
        path: [cleanedRoutePoints[0]],
        strokeColor: 'oklch(0.48 0.17 196)',
        strokeWeight: 5,
        strokeOpacity: 0.95,
        geodesic: true,
        zIndex: 2,
      })
      route.setMap(map)

      // Draw the route in over ~1.4s instead of appearing instantly — but not
      // on small/mobile viewports. Each animation frame calls Polyline.setPath()
      // on TWO overlays (glow + route), forcing Google Maps to re-tessellate and
      // repaint the whole path (up to 900+ points on a long walk) ~84 times in
      // 1.4s. On desktop that's imperceptible; on a mid-range mobile CPU/GPU
      // during the exact window it's also busy hydrating the page, it's a real
      // source of jank for a purely decorative flourish on a 240px-tall map.
      const isSmallViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
      if (reducedMotion || isSmallViewport) {
        glow.setPath(cleanedRoutePoints)
        route.setPath(cleanedRoutePoints)
      } else {
        const durationMs = 1400
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min((now - start) / durationMs, 1)
          const eased = 1 - Math.pow(1 - t, 3)
          const partial = partialPath(cleanedRoutePoints, eased)
          glow.setPath(partial)
          route.setPath(partial)
          if (t < 1) rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
      }

      // Color-coded start/end — green means the walk began here, red means it
      // stopped/ended here. No on-map text; the legend below explains the colors.
      new gm.Marker({
        position: cleanedRoutePoints[0], map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 8, fillColor: '#22c55e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 },
        title: 'Walk started here',
        zIndex: 10,
      })
      new gm.Marker({
        position: cleanedRoutePoints[cleanedRoutePoints.length - 1], map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 8, fillColor: '#EF4444', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 },
        title: 'Walk ended here',
        zIndex: 10,
      })

      // Cluster poop/pee events within ~6m so two events at the same spot
      // (a dog marking, then going, in one stop) render as ONE marker showing
      // both — previously they stacked exactly on top of each other and the
      // second silently hid the first.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function eventMarker(emoji: string, gm: any) {
        const w = emoji.length > 2 ? 44 : 32
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="32" viewBox="0 0 ${w} 32">
          <text x="${w / 2}" y="24" text-anchor="middle" font-size="20">${emoji}</text>
        </svg>`
        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new gm.Size(w, 32),
          anchor: new gm.Point(w / 2, 16),
        }
      }

      const clusters = clusterEvents(poopEvents, peeEvents)
      clusters.forEach((c, i) => {
        const emoji = c.hasPoop && c.hasPee ? '💩💧' : c.hasPoop ? '💩' : '💧'
        const title = c.hasPoop && c.hasPee ? `Poop and pee ${i + 1}` : c.hasPoop ? `Poop ${i + 1}` : `Pee ${i + 1}`
        new gm.Marker({ position: { lat: c.lat, lng: c.lng }, map, icon: eventMarker(emoji, gm), title, zIndex: 8 })
      })

      const bounds = new gm.LatLngBounds()
      cleanedRoutePoints.forEach(p => bounds.extend(p))
      clusters.forEach(c => bounds.extend({ lat: c.lat, lng: c.lng }))
      map.fitBounds(bounds, { top: 36, bottom: 36, left: 36, right: 36 })
    }

    loadGoogleMaps(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
      .then(initMap)
      .catch(err => console.error('[WalkMap] failed to load Google Maps', err))

    return () => { if (rafId !== null) cancelAnimationFrame(rafId) }
  }, [routePoints, poopEvents, peeEvents, reducedMotion])

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WalkReportCard({
  report,
  shareUrl,
  isFirstReport,
}: {
  report: WalkReport
  shareUrl: string
  isFirstReport: boolean
}) {
  const rm = useReducedMotion()
  const [burst, setBurst] = useState(false)
  const [copied, setCopied] = useState(false)
  const [photoExpanded, setPhotoExpanded] = useState(false)

  useEffect(() => {
    if (isFirstReport && !rm) { const t = setTimeout(() => setBurst(true), 600); return () => clearTimeout(t) }
  }, [isFirstReport, rm])
  useEffect(() => {
    if (burst) { const t = setTimeout(() => setBurst(false), 1200); return () => clearTimeout(t) }
  }, [burst])
  useEffect(() => {
    trackEvent('report_viewed', { is_first_report: isFirstReport })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mood       = parseMood(report.notes)
  const cleanNotes = cleanupNotes(report.notes)
  const hasMap     = (report.route_points?.length ?? 0) >= 2
  const distKm     = report.distance_meters
    ? report.distance_meters >= 1000
      ? `${(report.distance_meters / 1000).toFixed(1)}km`
      : `${Math.round(report.distance_meters)}m`
    : null

  const waText = encodeURIComponent(`${report.dog_name} just had a walk! 🐾\nFull GPS report:\n${shareUrl}`)

  async function handleCopy() {
    try { await navigator.clipboard.writeText(shareUrl) } catch { void 0 }
    trackEvent('report_shared', { method: 'copy_link' })
    setCopied(true); setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFBEB', paddingBottom: 32 }}>
      <AnimatePresence>{burst && <PawBurst />}</AnimatePresence>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,251,235,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(10,47,53,0.08)', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', boxShadow: CLAY, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#0A2F35' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="PupStep" style={{ height: 28, width: 'auto' }} />
        </div>

        <div style={{ width: 36 }} />
      </div>

      {/* Sub-header label */}
      <div style={{ textAlign: 'center', padding: '10px 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 1, background: 'rgba(255,140,82,0.4)' }} />
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: '#FF8C52', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Walk Report</p>
        <div style={{ width: 24, height: 1, background: 'rgba(255,140,82,0.4)' }} />
      </div>

      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── DOG CARD (claymorphism) ──────────────────────── */}
        <motion.div
          style={{ background: '#fff', borderRadius: 24, padding: '18px 18px', boxShadow: CLAY }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Circular dog photo or placeholder */}
            <div style={{ flexShrink: 0, width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.7), 0 4px 12px rgba(10,47,53,0.14)', border: '3px solid #fff' }}>
              {report.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.photo_url} alt={report.dog_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, oklch(0.48 0.17 196) 0%, oklch(0.38 0.15 196) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  🐾
                </div>
              )}
            </div>

            {/* Dog info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 26, fontWeight: 700, color: '#0A2F35', margin: '0 0 6px', lineHeight: 1 }}>
                {report.dog_name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <span style={{ color: 'oklch(0.48 0.17 196)', display: 'flex' }}><IconPerson /></span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 600, color: '#6B7280' }}>Walker: </span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: 'oklch(0.48 0.17 196)' }}>{report.provider_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#9CA3AF', display: 'flex' }}><IconCalendar /></span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#9CA3AF' }}>
                  {formatDate(report.walk_date)} · {formatTime(report.walk_date)}
                </span>
              </div>
            </div>

            {/* Completed badge */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 100, padding: '5px 10px' }}>
              <span style={{ color: '#22c55e', display: 'flex' }}><IconCheck /></span>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, color: '#166534' }}>Completed</span>
            </div>
          </div>
        </motion.div>

        {/* ── MAP (claymorphism card) ──────────────────────── */}
        {hasMap ? (
          <motion.div
            style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: CLAY }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}>
            <div style={{ width: '100%', height: 240, touchAction: 'none', overscrollBehavior: 'contain' }}>
              <WalkMap
                routePoints={report.route_points!}
                poopEvents={report.poop_events ?? []}
                peeEvents={report.pee_events ?? []}
                reducedMotion={!!rm}
              />
            </div>
            {/* Legend */}
            <div style={{ padding: '10px 16px', display: 'flex', gap: 16, alignItems: 'center', borderTop: '1px solid rgba(10,47,53,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 16 }}>💧</span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 600, color: '#374151' }}>Pee</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 16 }}>💩</span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 600, color: '#374151' }}>Poop</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 22, height: 4, borderRadius: 2, background: 'oklch(0.48 0.17 196)' }} />
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 600, color: '#374151' }}>Route</span>
              </div>

              {/* Start/end color key — pushed to the right */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 600, color: '#374151' }}>Started</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 600, color: '#374151' }}>Ended</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            style={{ background: '#fff', borderRadius: 24, padding: '16px 18px', boxShadow: CLAY, display: 'flex', alignItems: 'center', gap: 12 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', flexShrink: 0 }}>
              <IconRoute />
            </div>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#9CA3AF', margin: 0 }}>GPS route not captured for this walk</p>
          </motion.div>
        )}

        {/* ── STATS ROW ────────────────────────────────────── */}
        <motion.div
          style={{ background: '#fff', borderRadius: 24, padding: '18px 16px', boxShadow: CLAY, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}>
          {report.duration_mins > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 26 }}>⏱</span>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#0A2F35', margin: 0 }}>{report.duration_mins} min</p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 600, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</p>
            </div>
          )}
          {distKm && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 26 }}>📍</span>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#0A2F35', margin: 0 }}>{distKm}</p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 600, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distance</p>
            </div>
          )}
          {report.pee_count > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 26 }}>💧</span>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#1E6DB5', margin: 0 }}>{report.pee_count}</p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 600, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pee</p>
            </div>
          )}
          {report.poop_count > 0 && (
            <PoopStat
              count={report.poop_count}
              poopEvents={report.poop_events ?? []}
            />
          )}
          {/* Fallback if all zero */}
          {report.duration_mins === 0 && !distKm && report.pee_count === 0 && report.poop_count === 0 && (
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#9CA3AF', margin: '0 auto', padding: '8px 0' }}>Walk logged — stats not recorded</p>
          )}
        </motion.div>

        {/* ── DOG PHOTO (full-width card, tap to expand) ──── */}
        {report.photo_url && (
          <>
            <motion.div
              style={{ borderRadius: 24, overflow: 'hidden', boxShadow: CLAY, cursor: 'pointer', position: 'relative' }}
              onClick={() => setPhotoExpanded(true)}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={report.photo_url} alt={report.dog_name}
                style={{ width: '100%', height: 220, objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }} />
              <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '4px 8px' }}>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#fff', fontWeight: 600 }}>Tap to expand</span>
              </div>
            </motion.div>

            {/* Fullscreen lightbox */}
            {photoExpanded && (
              <div onClick={() => setPhotoExpanded(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <button onClick={() => setPhotoExpanded(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={report.photo_url} alt={report.dog_name} style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12 }} />
              </div>
            )}
          </>
        )}

        {/* ── MOOD CARD ────────────────────────────────────── */}
        {mood && (
          <motion.div
            style={{ background: '#fff', borderRadius: 24, padding: '16px 18px', boxShadow: CLAY, display: 'flex', alignItems: 'center', gap: 14 }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: EASE }}>
            <span style={{ fontSize: 36 }}>{mood.emoji}</span>
            <div>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: '#0A2F35', margin: '0 0 2px' }}>
                {mood.label.charAt(0).toUpperCase() + mood.label.slice(1)}
              </p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                {report.dog_name}&apos;s mood today
              </p>
            </div>
          </motion.div>
        )}

        {/* ── WALKER'S NOTE ────────────────────────────────── */}
        {cleanNotes && (
          <motion.div
            style={{ background: '#fff', borderRadius: 24, padding: '18px 18px', boxShadow: CLAY }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28, ease: EASE }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Walker avatar */}
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, oklch(0.48 0.17 196) 0%, oklch(0.38 0.15 196) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2), 0 4px 10px oklch(0.48 0.17 196 / 0.3)' }}>
                <span style={{ fontFamily: 'var(--font-fredoka)', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {report.provider_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 15, fontWeight: 700, color: 'oklch(0.48 0.17 196)', margin: '0 0 6px' }}>
                  Walker&apos;s note
                </p>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }}>
                  {cleanNotes}
                </p>
              </div>
              <span style={{ color: '#FF8C52', opacity: 0.4, flexShrink: 0, marginTop: 2 }}><IconPaw /></span>
            </div>
          </motion.div>
        )}

        {/* ── SHARE CTAs ───────────────────────────────────── */}
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32, ease: EASE }}>
          <motion.a
            href={`https://wa.me/?text=${waText}`}
            target="_blank" rel="noopener noreferrer"
            onClick={() => trackEvent('report_shared', { method: 'whatsapp' })}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px', borderRadius: 18, background: 'linear-gradient(160deg, #25D366 0%, #1aad54 100%)', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -4px 0 rgba(14,100,55,0.5), 0 8px 20px rgba(37,211,102,0.28)', color: '#fff', fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}
            whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
            <IconWA />
            Send to family
          </motion.a>
          <motion.button
            onClick={handleCopy}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px', borderRadius: 18, background: copied ? '#22c55e' : '#FF8C52', color: '#fff', fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: copied ? '0 4px 12px rgba(34,197,94,0.4)' : CLAY_ORANGE, transition: 'background 0.25s ease' }}
            whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
            <AnimatePresence mode="wait">
              {copied
                ? <motion.span key="done" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>Copied!</motion.span>
                : <motion.span key="copy" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>Copy link</motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </motion.div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="PupStep" style={{ height: 16, width: 'auto', opacity: 0.35 }} />
          </Link>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#CBD5E1', margin: '5px 0 0' }}>
            GPS-verified walk reports · Mumbai
          </p>
        </div>

      </div>
    </div>
  )
}
