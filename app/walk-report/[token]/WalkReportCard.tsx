'use client'

import { motion, useReducedMotion, AnimatePresence, useInView } from 'framer-motion'
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

// ─── Constants ────────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const C = {
  cream:  '#FFFBEB',
  dark:   '#0A2F35',
  teal:   'oklch(0.48 0.17 196)',
  orange: '#FF8C52',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatWalkDate(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    const day  = d.toLocaleDateString('en-IN', { weekday: 'long' })
    const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${day}, ${date} · ${time}`
  } catch { return isoDate }
}

function formatDateShort(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch { return '' }
}

function parseMood(notes: string | null) {
  if (!notes) return null
  const m = notes.match(/\[Mood:\s*([\S]+)\s+(\w+)\]/i)
  if (!m) return null
  return { emoji: m[1], label: m[2] }
}

function cleanupNotes(notes: string | null): string {
  if (!notes) return ''
  return notes.replace(/\[Mood:[^\]]*\]/i, '').trim()
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 700, startDelay = 200) {
  const [value, setValue] = useState(0)
  const prefersReduced = useReducedMotion()
  useEffect(() => {
    if (prefersReduced || target === 0) { setValue(target); return }
    const timer = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        setValue(Math.round((1 - Math.pow(1 - t, 4)) * target))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, startDelay)
    return () => clearTimeout(timer)
  }, [target, duration, startDelay, prefersReduced])
  return value
}

// ─── Paw burst ────────────────────────────────────────────────────────────────
function PawBurst() {
  const paws = [
    { x: 0, y: -75, r: -10, delay: 0, size: 22 },
    { x: 58, y: -48, r: 22, delay: 0.05, size: 18 },
    { x: 72, y: 18, r: 38, delay: 0.08, size: 20 },
    { x: 32, y: 74, r: -18, delay: 0.12, size: 17 },
    { x: -38, y: 70, r: 16, delay: 0.14, size: 19 },
    { x: -74, y: 14, r: -32, delay: 0.10, size: 17 },
    { x: -54, y: -50, r: 26, delay: 0.06, size: 21 },
  ]
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" style={{ top: '25%' }}>
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

// ─── 3D Stat Badge ────────────────────────────────────────────────────────────
function StatBadge({
  icon, count, label, bg, color, accent, delay = 0
}: {
  icon: React.ReactNode
  count: number
  label: string
  bg: string
  color: string
  accent: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px 0px' })
  const val = useCountUp(count, 600, inView ? delay : 9999)

  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.92)',
      transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      <div style={{
        background: bg,
        borderRadius: 18,
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        boxShadow: `0 2px 0 ${accent}40, 0 6px 20px ${accent}20, inset 0 1.5px 0 rgba(255,255,255,0.85)`,
        border: `1.5px solid ${accent}30`,
        minWidth: 76,
        cursor: 'default',
        transition: 'box-shadow 0.25s ease, transform 0.2s ease',
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'translateY(-3px) scale(1.04)'
          el.style.boxShadow = `0 6px 0 ${accent}40, 0 12px 28px ${accent}30, inset 0 1.5px 0 rgba(255,255,255,0.9)`
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = ''
          el.style.boxShadow = `0 2px 0 ${accent}40, 0 6px 20px ${accent}20, inset 0 1.5px 0 rgba(255,255,255,0.85)`
        }}>
        <div style={{ fontSize: 22, lineHeight: 1 }}>{icon}</div>
        <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 26, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{val}</p>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 700, color, margin: 0, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      </div>
    </div>
  )
}

// ─── Animated SVG Route ───────────────────────────────────────────────────────
function RouteAnimation({
  routePoints,
  poopEvents,
  peeEvents,
}: {
  routePoints: { lat: number; lng: number }[]
  poopEvents: { lat: number; lng: number; time: string }[]
  peeEvents: { lat: number; lng: number; time: string }[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px 0px' })

  if (!routePoints.length) return null

  // Normalize lat/lng to SVG coordinate space
  const W = 360, H = 180, PAD = 24
  const lats = routePoints.map(p => p.lat)
  const lngs = routePoints.map(p => p.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const rangeL = maxLng - minLng || 0.001
  const rangeA = maxLat - minLat || 0.001
  const scale = Math.min((W - PAD * 2) / rangeL, (H - PAD * 2) / rangeA)

  const toXY = (lat: number, lng: number) => ({
    x: PAD + (lng - minLng) * scale,
    y: H - PAD - (lat - minLat) * scale,
  })

  const points = routePoints.map(p => toXY(p.lat, p.lng))

  // Build smooth SVG path using cubic bezier
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`
  }

  const pathId = 'walkpath'

  return (
    <div ref={ref} style={{ padding: '0 0 0', position: 'relative' }}>
      <div style={{ padding: '0 20px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: C.dark, margin: 0 }}>
          Walk route
        </p>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>
          · {poopEvents.length + peeEvents.length} events
        </span>
      </div>

      <div style={{ width: '100%', background: 'linear-gradient(160deg, #e8f4f0 0%, #f0f9f6 50%, #e8f0e8 100%)', position: 'relative', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
          <defs>
            <path id={pathId} d={d} />
            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Shadow route */}
          <path d={d} fill="none" stroke="rgba(10,47,53,0.12)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />

          {/* Animated route line */}
          <motion.path
            d={d}
            fill="none"
            stroke="oklch(0.48 0.17 196)"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 1.8, ease: 'easeInOut', opacity: { duration: 0.3 } }}
          />

          {/* Animated paw moving along route */}
          {inView && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.8, delay: 0.3, times: [0, 0.1, 0.85, 1] }}>
              <motion.text
                fontSize="14"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ userSelect: 'none' }}>
                <animateMotion
                  dur="1.6s"
                  begin="0.3s"
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.4 0 0.6 1"
                  repeatCount="1"
                >
                  <mpath href={`#${pathId}`} />
                </animateMotion>
                🐾
              </motion.text>
            </motion.g>
          )}

          {/* Start dot */}
          <motion.circle cx={points[0].x} cy={points[0].y} r={7} fill="#22c55e" stroke="white" strokeWidth={2.5}
            initial={{ scale: 0 }} animate={inView ? { scale: 1 } : {}} transition={{ delay: 0.2, duration: 0.4, ease: EASE }} />
          {/* End dot */}
          <motion.circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={7}
            fill="oklch(0.48 0.17 196)" stroke="white" strokeWidth={2.5}
            initial={{ scale: 0 }} animate={inView ? { scale: 1 } : {}} transition={{ delay: 2.0, duration: 0.4, ease: EASE }} />

          {/* Poop events */}
          {poopEvents.map((e, i) => {
            const { x, y } = toXY(e.lat, e.lng)
            return (
              <motion.g key={`poop-${i}`} initial={{ scale: 0, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}}
                transition={{ delay: 1.5 + i * 0.1, duration: 0.35, ease: EASE }}>
                <circle cx={x} cy={y} r={10} fill="#92400E" stroke="white" strokeWidth={2} />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="white" fontWeight="bold" fontFamily="sans-serif">P</text>
              </motion.g>
            )
          })}

          {/* Pee events */}
          {peeEvents.map((e, i) => {
            const { x, y } = toXY(e.lat, e.lng)
            return (
              <motion.g key={`pee-${i}`} initial={{ scale: 0, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}}
                transition={{ delay: 1.6 + i * 0.1, duration: 0.35, ease: EASE }}>
                <circle cx={x} cy={y} r={9} fill="#1E40AF" stroke="white" strokeWidth={2} />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="white" fontWeight="bold" fontFamily="sans-serif">W</text>
              </motion.g>
            )
          })}
        </svg>

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: 10, right: 12, background: 'rgba(255,255,255,0.90)', borderRadius: 8, padding: '5px 10px', display: 'flex', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.10)', backdropFilter: 'blur(4px)' }}>
          <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>● Start</span>
          <span style={{ fontSize: 10, color: 'oklch(0.48 0.17 196)', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>● End</span>
          {poopEvents.length > 0 && <span style={{ fontSize: 10, color: '#92400E', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>P Poop ×{poopEvents.length}</span>}
          {peeEvents.length > 0 && <span style={{ fontSize: 10, color: '#1E40AF', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>W Pee ×{peeEvents.length}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Google Maps (interactive, fixed markers) ─────────────────────────────────
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
          { elementType: 'geometry', stylers: [{ color: '#f5f0e8' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8e0' }] },
          { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f0e8' }] },
        ],
      })

      new gm.Polyline({
        path: routePoints,
        strokeColor: '#0A7B8E',
        strokeWeight: 6,
        strokeOpacity: 0.9,
        geodesic: true,
      }).setMap(map)

      // Start marker
      new gm.Marker({
        position: routePoints[0], map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 10, fillColor: '#22c55e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
        title: 'Start', zIndex: 10,
      })

      // End marker
      new gm.Marker({
        position: routePoints[routePoints.length - 1], map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 10, fillColor: '#0f766e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
        title: 'End', zIndex: 10,
      })

      // Poop markers — SVG circle with 'P' (no emoji, works everywhere)
      const makeSvgIcon = (fill: string, letter: string, size: number, gm: any) => ({
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${fill}" stroke="white" stroke-width="2.5"/><text x="${size/2}" y="${size/2+4}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(size*0.4)}" fill="white" font-weight="bold">${letter}</text></svg>`
        ),
        scaledSize: new gm.Size(size, size),
        anchor: new gm.Point(size / 2, size / 2),
      })

      poopEvents?.forEach((e, i) => {
        new gm.Marker({
          position: { lat: e.lat, lng: e.lng }, map,
          icon: makeSvgIcon('#92400E', 'P', 28, gm),
          title: `Poop ${i + 1}`, zIndex: 8,
        })
      })

      peeEvents?.forEach((e, i) => {
        new gm.Marker({
          position: { lat: e.lat, lng: e.lng }, map,
          icon: makeSvgIcon('#1E40AF', 'W', 26, gm),
          title: `Pee ${i + 1}`, zIndex: 8,
        })
      })

      // Fit bounds including event markers
      const bounds = new gm.LatLngBounds()
      routePoints.forEach(p => bounds.extend(p))
      poopEvents?.forEach(e => bounds.extend({ lat: e.lat, lng: e.lng }))
      peeEvents?.forEach(e => bounds.extend({ lat: e.lat, lng: e.lng }))
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 })
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

// ─── Section reveal wrapper ───────────────────────────────────────────────────
function Reveal({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px 0px' })
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(22px)',
      transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
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
  const prefersReduced = useReducedMotion()
  const [burst, setBurst] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isFirstReport && !prefersReduced) {
      const t = setTimeout(() => setBurst(true), 600)
      return () => clearTimeout(t)
    }
  }, [isFirstReport, prefersReduced])

  useEffect(() => {
    if (burst) { const t = setTimeout(() => setBurst(false), 1200); return () => clearTimeout(t) }
  }, [burst])

  const mood      = parseMood(report.notes)
  const cleanNotes = cleanupNotes(report.notes)

  const moodConfig: Record<string, { bg: string; color: string; border: string }> = {
    great:   { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
    good:    { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
    okay:    { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
    tired:   { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
    anxious: { bg: '#FFF1F2', color: '#9F1239', border: '#FECDD3' },
    issue:   { bg: '#FFF1F2', color: '#9F1239', border: '#FECDD3' },
  }
  const mc = moodConfig[mood?.label?.toLowerCase() ?? ''] ?? moodConfig.okay

  const hasMap    = report.route_points && report.route_points.length >= 2
  const hasPoop   = (report.poop_events?.length ?? 0) > 0
  const hasPee    = (report.pee_events?.length ?? 0) > 0
  const distKm    = report.distance_meters ? (report.distance_meters / 1000).toFixed(2) : null

  const waFamilyText = encodeURIComponent(`${report.dog_name} just had a walk! 🐾\nFull GPS report:\n${shareUrl}`)
  const waVetText    = encodeURIComponent(`Hi Doctor, here is ${report.dog_name}'s recent walk report:\n${shareUrl}`)

  async function handleCopy() {
    try { await navigator.clipboard.writeText(shareUrl) } catch { void 0 }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, overflowX: 'hidden' }}>
      <AnimatePresence>{burst && <PawBurst />}</AnimatePresence>

      {/* ── FIRST REPORT CELEBRATION ────────────────────────────── */}
      {isFirstReport && (
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{ background: `linear-gradient(135deg, ${C.teal} 0%, oklch(0.38 0.15 196) 100%)`, padding: '18px 20px 14px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
            First walk report!
          </p>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '0 0 14px', lineHeight: 1.5 }}>
            {report.dog_name}&apos;s care diary has started.
          </p>
        </motion.div>
      )}

      {/* ── HERO — dog photo, full bleed ────────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: report.photo_url ? '48vh' : 100,
        minHeight: report.photo_url ? 260 : 0,
        maxHeight: report.photo_url ? 420 : 100,
        overflow: 'hidden',
      }}>
        {report.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.photo_url} alt={report.dog_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${C.dark} 0%, oklch(0.35 0.12 196) 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 64 }}>🐾</span>
          </div>
        )}

        {/* Gradient overlay */}
        {report.photo_url && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.06) 0%, transparent 40%, rgba(10,47,53,0.85) 100%)' }} />
        )}

        {/* Logo — top left */}
        <div style={{ position: 'absolute', top: 14, left: 16, zIndex: 10 }}>
          <Link href="/" style={{ display: 'inline-block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="PupStep"
              style={{ height: 28, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.92, dropShadow: '0 1px 4px rgba(0,0,0,0.4)' } as React.CSSProperties}
            />
          </Link>
        </div>

        {/* Walk Report label — top right */}
        <span style={{
          position: 'absolute', top: 18, right: 16,
          fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.75)',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          fontFamily: 'var(--font-nunito)', textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: '3px 7px',
        }}>
          Walk Report
        </span>

        {/* Dog name + date overlay (when photo exists) */}
        {report.photo_url && (
          <motion.div
            style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: EASE }}>
            <h1 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 40, fontWeight: 700, color: '#fff', margin: '0 0 2px', lineHeight: 1.05, textShadow: '0 2px 14px rgba(0,0,0,0.4)' }}>
              {report.dog_name}
            </h1>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'rgba(255,255,255,0.88)', margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
              {formatDateShort(report.walk_date)} · by {report.provider_name}
            </p>
          </motion.div>
        )}
      </div>

      {/* ── DOG NAME (no photo) ──────────────────────────────────── */}
      {!report.photo_url && (
        <motion.div style={{ padding: '20px 20px 0' }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: EASE }}>
          <h1 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 32, fontWeight: 700, color: C.dark, margin: '0 0 2px' }}>
            {report.dog_name}
          </h1>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#9CA3AF', margin: 0 }}>
            {formatWalkDate(report.walk_date)} · {report.provider_name}
          </p>
        </motion.div>
      )}

      {/* ── VERIFIED BADGE ───────────────────────────────────────── */}
      {report.is_verified && (
        <motion.div style={{ padding: '10px 20px 0', display: 'flex' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.25 }}>
          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, background: 'oklch(0.94 0.06 196)', color: 'oklch(0.44 0.16 196)', padding: '4px 12px', borderRadius: 100 }}>
            GPS Verified Walk
          </span>
        </motion.div>
      )}

      {/* ── 3D STAT BADGES ──────────────────────────────────────── */}
      <div style={{ padding: '18px 20px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {report.poop_count > 0 && (
          <StatBadge icon="💩" count={report.poop_count} label={report.poop_count === 1 ? 'poop' : 'poops'} bg="#FEF3C7" color="#92400E" accent="#FDE68A" delay={0} />
        )}
        {report.pee_count > 0 && (
          <StatBadge icon="💧" count={report.pee_count} label={report.pee_count === 1 ? 'pee' : 'pees'} bg="#EFF6FF" color="#1E40AF" accent="#BFDBFE" delay={80} />
        )}
        {report.duration_mins > 0 && (
          <StatBadge icon="⏱" count={report.duration_mins} label="mins" bg="#F0FDF4" color="#166534" accent="#BBF7D0" delay={160} />
        )}
        {distKm && (
          <StatBadge icon="📍" count={parseFloat(distKm)} label="km" bg="#F5F3FF" color="#6B21A8" accent="#DDD6FE" delay={240} />
        )}
      </div>

      {/* ── ANIMATED SVG ROUTE ──────────────────────────────────── */}
      {hasMap && (
        <Reveal delay={100}>
          <RouteAnimation
            routePoints={report.route_points!}
            poopEvents={report.poop_events ?? []}
            peeEvents={report.pee_events ?? []}
          />
        </Reveal>
      )}

      {/* ── GOOGLE MAPS (interactive, fixed markers) ─────────────── */}
      {hasMap && (
        <Reveal delay={200}>
          <div style={{ padding: '0 0 0' }}>
            <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>
                Full GPS map
              </p>
              {(hasPoop || hasPee) && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {hasPoop && <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#92400E', fontWeight: 700, background: '#FEF3C7', borderRadius: 6, padding: '2px 7px' }}>P = Poop</span>}
                  {hasPee && <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#1E40AF', fontWeight: 700, background: '#EFF6FF', borderRadius: 6, padding: '2px 7px' }}>W = Pee</span>}
                </div>
              )}
            </div>
            <div style={{ width: '100%', height: 280, background: '#f5f0e8' }}>
              <WalkMap
                routePoints={report.route_points!}
                poopEvents={report.poop_events ?? []}
                peeEvents={report.pee_events ?? []}
              />
            </div>
          </div>
        </Reveal>
      )}

      {/* No GPS message */}
      {!hasMap && (
        <Reveal style={{ padding: '0 20px 4px' }}>
          <div style={{ background: '#F1F5F9', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>📍</span>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: 0 }}>
              GPS route not captured for this walk
            </p>
          </div>
        </Reveal>
      )}

      {/* ── MOOD + NOTES ─────────────────────────────────────────── */}
      {(mood || cleanNotes) && (
        <div style={{ padding: '16px 20px 8px' }}>
          {mood && (
            <Reveal delay={0}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: mc.bg, borderRadius: 16, marginBottom: 12, border: `1px solid ${mc.border}` }}>
                <span style={{ fontSize: 30 }}>{mood.emoji}</span>
                <div>
                  <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 17, fontWeight: 700, color: mc.color, margin: 0 }}>
                    {mood.label.charAt(0).toUpperCase() + mood.label.slice(1)}
                  </p>
                  <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: mc.color, margin: '2px 0 0', opacity: 0.7 }}>
                    {report.dog_name}&apos;s mood today
                  </p>
                </div>
              </div>
            </Reveal>
          )}
          {cleanNotes && (
            <Reveal delay={60}>
              <div style={{ padding: '14px 18px', background: 'oklch(0.997 0.004 85)', borderRadius: 16, border: '1px solid rgba(10,47,53,0.06)' }}>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#374151', fontStyle: 'italic', lineHeight: 1.65, margin: '0 0 6px' }}>
                  &ldquo;{cleanNotes}&rdquo;
                </p>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0, textAlign: 'right' }}>
                  — {report.provider_name}
                </p>
              </div>
            </Reveal>
          )}
        </div>
      )}

      {/* ── WALKER CARD ──────────────────────────────────────────── */}
      <Reveal delay={80} style={{ padding: '8px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.7)', borderRadius: 14, border: '1px solid rgba(10,47,53,0.07)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: '#fff' }}>
              {report.provider_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>
              Walked by {report.provider_name}
            </p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0 }}>
              via PupStep · GPS tracked
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 700, color: '#22c55e' }}>Verified</span>
          </div>
        </div>
      </Reveal>

      {/* ── SHARE SECTION ────────────────────────────────────────── */}
      <Reveal delay={100} style={{ margin: '12px 20px 24px' }}>
        <div style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 20, padding: 16, boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(10,47,53,0.07)', border: '1px solid rgba(226,220,200,0.7)', backdropFilter: 'blur(8px)' }}>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', margin: '0 0 12px' }}>
            Share this report
          </p>

          <motion.a
            href={`https://wa.me/?text=${waFamilyText}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '14px', borderRadius: 16, background: 'linear-gradient(160deg, #25D366 0%, #1aad54 100%)', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -4px 0 rgba(14,100,55,0.45), 0 8px 20px rgba(37,211,102,0.28)', color: '#fff', textDecoration: 'none', fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, marginBottom: 10, boxSizing: 'border-box' }}
            whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.845L.057 23.428a.5.5 0 00.609.61l5.64-1.476A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.91 0-3.698-.5-5.244-1.373l-.375-.217-3.888 1.018 1.034-3.774-.237-.389A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Send to family
          </motion.a>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <motion.a
              href={`https://wa.me/?text=${waVetText}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 14, background: 'white', border: '1px solid rgba(226,220,200,0.7)', color: C.dark, textDecoration: 'none', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,1), 0 3px 8px rgba(0,0,0,0.05)', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700 }}
              whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
              Send to vet
            </motion.a>
            <motion.button
              onClick={handleCopy}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 14, background: copied ? '#ECFDF5' : 'white', border: copied ? '1px solid #BBF7D0' : '1px solid rgba(226,220,200,0.7)', color: copied ? '#15803D' : C.dark, boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,1), 0 3px 8px rgba(0,0,0,0.05)', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}
              whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
              <AnimatePresence mode="wait">
                {copied
                  ? <motion.span key="copied" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>Copied!</motion.span>
                  : <motion.span key="copy" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>Copy link</motion.span>
                }
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </Reveal>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px 40px', textAlign: 'center', borderTop: '1px solid rgba(10,47,53,0.06)' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="PupStep" style={{ height: 18, width: 'auto', opacity: 0.45 }} />
        </Link>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#CBD5E1', margin: '6px 0 0' }}>
          GPS-verified walk reports for Mumbai dog parents
        </p>
      </div>

    </div>
  )
}
