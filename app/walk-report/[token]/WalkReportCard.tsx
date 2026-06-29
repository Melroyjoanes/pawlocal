'use client'

import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'

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
  poop_events: { lat: number; lng: number; time: string }[] | null
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

// ─── Count-up ─────────────────────────────────────────────────────────────────
function useCountUp(target: number, delay = 400) {
  const [val, setVal] = useState(0)
  const rm = useReducedMotion()
  useEffect(() => {
    if (rm || target === 0) { setVal(target); return }
    const t = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - start) / 650, 1)
        setVal(Math.round((1 - Math.pow(1 - progress, 4)) * target))
        if (progress < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(t)
  }, [target, delay, rm])
  return val
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function IconRoute() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5c1.4 0 2.5-1.1 2.5-2.5S18.9 14 17.5 14H6.5C5.1 14 4 12.9 4 11.5S5.1 9 6.5 9H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  )
}
function IconDrop() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  )
}
function IconPoop() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-1.1 0-2 .9-2 2 0 .74.4 1.38 1 1.73V7H9.5C7.6 7 6 8.6 6 10.5c0 .17.01.34.04.5C4.83 11.35 4 12.33 4 13.5 4 15.43 5.57 17 7.5 17h9c1.93 0 3.5-1.57 3.5-3.5 0-1.17-.83-2.15-2.04-2.5.03-.16.04-.33.04-.5C18 8.6 16.4 7 14.5 7H13V5.73c.6-.35 1-.99 1-1.73 0-1.1-.9-2-2-2z" />
      <rect x="8" y="17" width="8" height="2" rx="1" />
      <rect x="9" y="19" width="6" height="2" rx="1" />
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

// ─── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ icon, value, label, delay, bg, color, glow }: {
  icon: React.ReactNode; value: string | number; label: string; delay: number
  bg: string; color: string; glow: string
}) {
  return (
    <motion.div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}>
      <div style={{ width: 50, height: 50, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `inset 0 2px 0 rgba(255,255,255,0.22), inset 0 -3px 0 rgba(0,0,0,0.18), 0 4px 14px ${glow}` }}>
        {icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 600, color: '#9CA3AF', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      </div>
    </motion.div>
  )
}

// ─── Google Maps ──────────────────────────────────────────────────────────────
function WalkMap({ routePoints, poopEvents, peeEvents }: {
  routePoints: { lat: number; lng: number }[]
  poopEvents: { lat: number; lng: number; time: string }[]
  peeEvents: { lat: number; lng: number; time: string }[]
}) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!routePoints?.length || !mapRef.current) return

    function initMap() {
      if (!mapRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gm = (window as any).google.maps
      const map = new gm.Map(mapRef.current, {
        zoom: 15,
        center: routePoints[0],
        disableDefaultUI: true,
        gestureHandling: 'cooperative',
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { elementType: 'geometry', stylers: [{ color: '#f8f4ee' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8e0' }] },
          { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8f4ee' }] },
        ],
      })

      // Route polyline
      new gm.Polyline({
        path: routePoints,
        strokeColor: 'oklch(0.48 0.17 196)',
        strokeWeight: 5,
        strokeOpacity: 0.95,
        geodesic: true,
      }).setMap(map)

      // Start dot
      new gm.Marker({
        position: routePoints[0], map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 8, fillColor: '#22c55e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 },
        zIndex: 10,
      })
      // End dot
      new gm.Marker({
        position: routePoints[routePoints.length - 1], map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 8, fillColor: 'oklch(0.48 0.17 196)', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 },
        zIndex: 10,
      })

      // Emoji bubble markers — fun and instantly recognisable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function emojiBubble(emoji: string, bg: string, gm: any) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
          <circle cx="19" cy="19" r="18" fill="${bg}" stroke="white" stroke-width="2.5"/>
          <text x="19" y="26" text-anchor="middle" font-size="20">${emoji}</text>
        </svg>`
        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new gm.Size(38, 38),
          anchor: new gm.Point(19, 19),
        }
      }

      poopEvents?.forEach((e, i) => {
        new gm.Marker({ position: { lat: e.lat, lng: e.lng }, map, icon: emojiBubble('💩', '#FEF3C7', gm), title: `Poop ${i + 1}`, zIndex: 8 })
      })
      peeEvents?.forEach((e, i) => {
        new gm.Marker({ position: { lat: e.lat, lng: e.lng }, map, icon: emojiBubble('💧', '#EFF6FF', gm), title: `Pee ${i + 1}`, zIndex: 8 })
      })

      const bounds = new gm.LatLngBounds()
      routePoints.forEach(p => bounds.extend(p))
      poopEvents?.forEach(e => bounds.extend({ lat: e.lat, lng: e.lng }))
      peeEvents?.forEach(e => bounds.extend({ lat: e.lat, lng: e.lng }))
      map.fitBounds(bounds, { top: 36, bottom: 36, left: 36, right: 36 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps) {
      initMap()
    } else {
      if (document.querySelector('script[data-gm]')) {
        const check = setInterval(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).google?.maps) { clearInterval(check); initMap() }
        }, 100)
        return
      }
      const script = document.createElement('script')
      script.setAttribute('data-gm', '1')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      script.async = true
      script.onload = initMap
      document.head.appendChild(script)
    }
  }, [routePoints, poopEvents, peeEvents])

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

  useEffect(() => {
    if (isFirstReport && !rm) { const t = setTimeout(() => setBurst(true), 600); return () => clearTimeout(t) }
  }, [isFirstReport, rm])
  useEffect(() => {
    if (burst) { const t = setTimeout(() => setBurst(false), 1200); return () => clearTimeout(t) }
  }, [burst])

  const mood       = parseMood(report.notes)
  const cleanNotes = cleanupNotes(report.notes)
  const hasMap     = (report.route_points?.length ?? 0) >= 2
  const durationVal = useCountUp(report.duration_mins, 300)
  const poopVal    = useCountUp(report.poop_count, 400)
  const peeVal     = useCountUp(report.pee_count, 500)
  const distKm     = report.distance_meters
    ? report.distance_meters >= 1000
      ? `${(report.distance_meters / 1000).toFixed(1)}km`
      : `${Math.round(report.distance_meters)}m`
    : null

  const waText    = encodeURIComponent(`${report.dog_name} just had a walk! 🐾\nFull GPS report:\n${shareUrl}`)
  const waVetText = encodeURIComponent(`Hi Doctor, here is ${report.dog_name}'s recent walk report:\n${shareUrl}`)

  async function handleCopy() {
    try { await navigator.clipboard.writeText(shareUrl) } catch { void 0 }
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

        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', boxShadow: CLAY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A2F35' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
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
            <div style={{ width: '100%', height: 240 }}>
              <WalkMap
                routePoints={report.route_points!}
                poopEvents={report.poop_events ?? []}
                peeEvents={report.pee_events ?? []}
              />
            </div>
            {/* Legend */}
            <div style={{ padding: '10px 16px', display: 'flex', gap: 16, alignItems: 'center', borderTop: '1px solid rgba(10,47,53,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#1E6DB5', display: 'flex' }}><IconDrop /></span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 600, color: '#374151' }}>Pee</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#7C3A18', display: 'flex' }}><IconPoop /></span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 600, color: '#374151' }}>Poop</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 22, height: 4, borderRadius: 2, background: 'oklch(0.48 0.17 196)' }} />
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 600, color: '#374151' }}>Route</span>
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
          style={{ background: '#fff', borderRadius: 24, padding: '20px 12px', boxShadow: CLAY, display: 'flex', gap: 4 }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}>
          {report.duration_mins > 0 && (
            <StatBox icon={<IconClock />} value={`${durationVal} min`} label="Duration" delay={0.25} bg="#FF8C52" color="#FF8C52" glow="rgba(255,140,82,0.35)" />
          )}
          {distKm && (
            <StatBox icon={<IconRoute />} value={distKm} label="Distance" delay={0.32} bg="oklch(0.48 0.17 196)" color="oklch(0.48 0.17 196)" glow="oklch(0.48 0.17 196 / 0.35)" />
          )}
          {report.pee_count > 0 && (
            <StatBox icon={<IconDrop />} value={peeVal} label="Pee" delay={0.39} bg="#1E6DB5" color="#1E6DB5" glow="rgba(30,109,181,0.35)" />
          )}
          {report.poop_count > 0 && (
            <StatBox icon={<IconPoop />} value={poopVal} label="Poop" delay={0.46} bg="#92400E" color="#92400E" glow="rgba(146,64,14,0.30)" />
          )}
          {/* Fallback if all zero */}
          {report.duration_mins === 0 && !distKm && report.pee_count === 0 && report.poop_count === 0 && (
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#9CA3AF', margin: '0 auto', padding: '8px 0' }}>Walk logged — stats not recorded</p>
          )}
        </motion.div>

        {/* ── DOG PHOTO (full-width card) ──────────────────── */}
        {report.photo_url && (
          <motion.div
            style={{ borderRadius: 24, overflow: 'hidden', boxShadow: CLAY }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={report.photo_url} alt={report.dog_name}
              style={{ width: '100%', height: 220, objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }} />
          </motion.div>
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
          style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32, ease: EASE }}>

          {/* Primary: Send to family — full-width green WhatsApp */}
          <motion.a
            href={`https://wa.me/?text=${waText}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px', borderRadius: 18, background: 'linear-gradient(160deg, #25D366 0%, #1aad54 100%)', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -4px 0 rgba(14,100,55,0.50), 0 8px 20px rgba(37,211,102,0.28)', color: '#fff', fontFamily: 'var(--font-fredoka)', fontSize: 17, fontWeight: 700, textDecoration: 'none' }}
            whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
            <IconWA />
            Send to family
          </motion.a>

          {/* Secondary row: Send to vet + Copy link */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <motion.a
              href={`https://wa.me/?text=${waVetText}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 16, background: '#fff', border: '1.5px solid rgba(10,47,53,0.12)', color: '#0A2F35', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: CLAY }}
              whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
              Send to vet
            </motion.a>
            <motion.button
              onClick={handleCopy}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', borderRadius: 16, background: copied ? '#ECFDF5' : '#fff', border: copied ? '1.5px solid #BBF7D0' : '1.5px solid rgba(10,47,53,0.12)', color: copied ? '#15803D' : '#0A2F35', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: CLAY, transition: 'all 0.2s ease' }}
              whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
              <AnimatePresence mode="wait">
                {copied
                  ? <motion.span key="done" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>Copied!</motion.span>
                  : <motion.span key="copy" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>Copy link</motion.span>
                }
              </AnimatePresence>
            </motion.button>
          </div>
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
