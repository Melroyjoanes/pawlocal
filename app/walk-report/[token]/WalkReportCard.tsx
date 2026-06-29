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

// ─── Constants ────────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

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
function useCountUp(target: number, duration = 700, startDelay = 400) {
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
    { x: 0,   y: -75, r: -10, delay: 0,    size: 22 },
    { x: 58,  y: -48, r: 22,  delay: 0.05, size: 18 },
    { x: 72,  y: 18,  r: 38,  delay: 0.08, size: 20 },
    { x: 32,  y: 74,  r: -18, delay: 0.12, size: 17 },
    { x: -38, y: 70,  r: 16,  delay: 0.14, size: 19 },
    { x: -74, y: 14,  r: -32, delay: 0.10, size: 17 },
    { x: -54, y: -50, r: 26,  delay: 0.06, size: 21 },
  ]
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ top: '25%' }}>
      {paws.map((p, i) => (
        <motion.span key={i} className="absolute select-none" style={{ fontSize: p.size }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.2, rotate: 0 }}
          animate={{ opacity: [0, 1, 1, 0], x: p.x, y: p.y, scale: [0.2, 1.1, 1, 0.75], rotate: p.r }}
          transition={{ duration: 1.05, delay: p.delay, ease: [0.25, 0.46, 0.45, 0.94] }}>
          🐾
        </motion.span>
      ))}
    </div>
  )
}

// ─── Stat pill (V1 style — simple, with count-up) ────────────────────────────
function StatPill({
  emoji, count, singular, plural, unit, bg, color, delay = 0,
}: {
  emoji: string
  count: number
  singular?: string
  plural?: string
  unit?: string
  bg: string
  color: string
  delay?: number
}) {
  const val = useCountUp(count, 650, delay)
  if (count === 0 && !unit) return null
  const label = unit ? unit : (val === 1 && singular ? singular : (plural ?? singular ?? ''))
  return (
    <motion.span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600, background: bg, color, fontFamily: 'var(--font-nunito,sans-serif)', userSelect: 'none', flexShrink: 0 }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: delay / 1000, ease: EASE }}>
      {emoji} {val}{label ? ` ${label}` : ''}
    </motion.span>
  )
}

// ─── Google Maps — fixed markers ──────────────────────────────────────────────
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

      // Teal route
      new gm.Polyline({
        path: routePoints,
        strokeColor: '#0A7B8E',
        strokeWeight: 5,
        strokeOpacity: 0.9,
        geodesic: true,
      }).setMap(map)

      // Start dot — green
      new gm.Marker({
        position: routePoints[0], map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 9, fillColor: '#22c55e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 },
        title: 'Start', zIndex: 10,
      })

      // End dot — teal
      new gm.Marker({
        position: routePoints[routePoints.length - 1], map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 9, fillColor: '#0f766e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 },
        title: 'End', zIndex: 10,
      })

      // Pin-shaped SVG markers — much more visible than circles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function makePinIcon(fill: string, letter: string, gm: any) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
          <path d="M14 0C7.4 0 2 5.4 2 12c0 9 12 24 12 24s12-15 12-24C26 5.4 20.6 0 14 0z" fill="${fill}" stroke="white" stroke-width="2"/>
          <circle cx="14" cy="12" r="6" fill="white" opacity="0.9"/>
          <text x="14" y="16" text-anchor="middle" font-family="sans-serif" font-size="8" fill="${fill}" font-weight="900">${letter}</text>
        </svg>`
        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new gm.Size(28, 36),
          anchor: new gm.Point(14, 36),
        }
      }

      // Poop — dark brown pin
      poopEvents?.forEach((e, i) => {
        new gm.Marker({
          position: { lat: e.lat, lng: e.lng }, map,
          icon: makePinIcon('#92400E', 'P', gm),
          title: `Poop ${i + 1}`, zIndex: 8,
        })
      })

      // Pee — amber/yellow pin (much more visible on light map tiles)
      peeEvents?.forEach((e, i) => {
        new gm.Marker({
          position: { lat: e.lat, lng: e.lng }, map,
          icon: makePinIcon('#B45309', 'W', gm),
          title: `Pee ${i + 1}`, zIndex: 8,
        })
      })

      // Fit all points including events
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

  const mood       = parseMood(report.notes)
  const cleanNotes = cleanupNotes(report.notes)
  const hasMap     = report.route_points && report.route_points.length >= 2
  const distKm     = report.distance_meters
    ? report.distance_meters >= 1000
      ? `${(report.distance_meters / 1000).toFixed(2)} km`
      : `${Math.round(report.distance_meters)} m`
    : null

  const moodConfig: Record<string, { bg: string; color: string; border: string }> = {
    great:   { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
    good:    { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
    okay:    { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
    tired:   { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
    anxious: { bg: '#FFF1F2', color: '#9F1239', border: '#FECDD3' },
    issue:   { bg: '#FFF1F2', color: '#9F1239', border: '#FECDD3' },
  }
  const mc = moodConfig[mood?.label?.toLowerCase() ?? ''] ?? moodConfig.okay

  const waFamilyText = encodeURIComponent(`${report.dog_name} just had a walk! 🐾\nFull GPS report:\n${shareUrl}`)
  const waVetText    = encodeURIComponent(`Hi Doctor, here is ${report.dog_name}'s recent walk report:\n${shareUrl}`)

  async function handleCopy() {
    try { await navigator.clipboard.writeText(shareUrl) } catch { void 0 }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFBEB' }}>
      <AnimatePresence>{burst && <PawBurst />}</AnimatePresence>

      {/* ── FIRST REPORT CELEBRATION ─────────────────────────── */}
      {isFirstReport && (
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ background: 'linear-gradient(135deg, oklch(0.48 0.17 196) 0%, oklch(0.38 0.15 196) 100%)', padding: '18px 20px 14px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
            First walk report!
          </p>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
            {report.dog_name}&apos;s care diary has started.
          </p>
        </motion.div>
      )}

      {/* ── HERO — dog photo, full bleed ─────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: report.photo_url ? '45vh' : 100,
        minHeight: report.photo_url ? 280 : 0,
        maxHeight: report.photo_url ? 420 : 100,
        overflow: 'hidden',
      }}>
        {report.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.photo_url} alt={report.dog_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0A2F35 0%, oklch(0.35 0.12 196) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 64 }}>🐾</span>
          </div>
        )}

        {/* Gradient overlay */}
        {report.photo_url && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 40%, rgba(10,47,53,0.82) 100%)' }} />
        )}

        {/* Logo — dark pill backdrop guarantees visibility on any background */}
        <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.36)', borderRadius: 8, padding: '5px 10px', backdropFilter: 'blur(4px)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="PupStep" style={{ height: 22, width: 'auto', filter: 'brightness(0) invert(1)' }} />
          </Link>
        </div>

        {/* Walk Report label */}
        <span style={{ position: 'absolute', top: 18, right: 16, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-nunito)', background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '3px 7px', backdropFilter: 'blur(4px)' }}>
          Walk Report
        </span>

        {/* Dog name + date (when photo exists) */}
        {report.photo_url && (
          <motion.div
            style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}>
            <h1 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 38, fontWeight: 700, color: '#ffffff', margin: '0 0 2px', lineHeight: 1.1, textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
              {report.dog_name}
            </h1>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
              {formatDateShort(report.walk_date)} · by {report.provider_name}
            </p>
          </motion.div>
        )}
      </div>

      {/* ── DOG NAME (no photo) ──────────────────────────────── */}
      {!report.photo_url && (
        <motion.div style={{ padding: '20px 20px 0' }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: EASE }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <motion.span style={{ fontSize: 32, display: 'inline-block' }}
              animate={!prefersReduced ? { rotate: [0, -10, 10, -6, 0] } : {}}
              transition={{ duration: 0.6, delay: 0.5, ease: EASE }}>
              🐕
            </motion.span>
            <h1 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 32, fontWeight: 700, color: '#0A2F35', margin: 0 }}>
              {report.dog_name}
            </h1>
            {report.is_verified && (
              <span style={{ fontSize: 11, fontWeight: 700, background: 'oklch(0.94 0.06 196)', color: 'oklch(0.44 0.16 196)', padding: '3px 10px', borderRadius: 100, fontFamily: 'var(--font-nunito)' }}>
                GPS Verified
              </span>
            )}
          </div>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#9CA3AF', margin: 0 }}>
            {formatWalkDate(report.walk_date)} · {report.provider_name}
          </p>
        </motion.div>
      )}

      {/* ── STAT PILLS ───────────────────────────────────────── */}
      <motion.div
        style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8, overflowX: 'auto' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25, ease: EASE }}>
        <StatPill emoji="💩" count={report.poop_count} singular="poop" plural="poops" bg="#FEF3C7" color="#92400E" delay={350} />
        <StatPill emoji="💧" count={report.pee_count} singular="pee" plural="pees" bg="#EFF6FF" color="#1E40AF" delay={470} />
        {report.duration_mins > 0 && (
          <StatPill emoji="⏱" count={report.duration_mins} unit="mins" bg="#F0FDF4" color="#166534" delay={590} />
        )}
        {report.distance_meters && report.distance_meters > 0 && (
          <motion.span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600, background: '#F5F3FF', color: '#6B21A8', fontFamily: 'var(--font-nunito)', userSelect: 'none', flexShrink: 0 }}
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.72, ease: EASE }}>
            📏 {distKm}
          </motion.span>
        )}
      </motion.div>

      {/* ── GPS MAP — full width, edge to edge ───────────────── */}
      {hasMap ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: EASE }}>
          {/* Section label */}
          <div style={{ padding: '4px 20px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-fredoka)', fontSize: 15, fontWeight: 700, color: '#0A2F35' }}>GPS Route</span>
            {((report.poop_events?.length ?? 0) + (report.pee_events?.length ?? 0)) > 0 && (
              <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-nunito)', fontWeight: 600 }}>
                · {(report.poop_events?.length ?? 0) + (report.pee_events?.length ?? 0)} events mapped
              </span>
            )}
          </div>
          {/* Map: full width */}
          <div style={{ width: '100%', height: 320, position: 'relative', background: '#f5f0e8' }}>
            <WalkMap
              routePoints={report.route_points!}
              poopEvents={report.poop_events ?? []}
              peeEvents={report.pee_events ?? []}
            />
            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '6px 10px', display: 'flex', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', backdropFilter: 'blur(4px)' }}>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>● Start</span>
              <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>● End</span>
              {(report.poop_events?.length ?? 0) > 0 && <span style={{ fontSize: 11, color: '#92400E', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>P Poop ×{report.poop_events!.length}</span>}
              {(report.pee_events?.length ?? 0) > 0 && <span style={{ fontSize: 11, color: '#B45309', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>W Pee ×{report.pee_events!.length}</span>}
            </div>
          </div>
        </motion.div>
      ) : (
        <div style={{ padding: '0 20px 4px' }}>
          <div style={{ background: '#F1F5F9', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📍</span>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: 0 }}>
              GPS route not captured for this walk
            </p>
          </div>
        </div>
      )}

      {/* ── MOOD + NOTES ─────────────────────────────────────── */}
      <div style={{ padding: '16px 20px 8px' }}>
        {mood && (
          <motion.div
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: mc.bg, borderRadius: 16, marginBottom: 12, border: `1px solid ${mc.border}` }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.45, ease: EASE }}>
            <span style={{ fontSize: 32 }}>{mood.emoji}</span>
            <div>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 17, fontWeight: 700, color: mc.color, margin: 0 }}>
                {mood.label.charAt(0).toUpperCase() + mood.label.slice(1)}
              </p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: mc.color, margin: '2px 0 0', opacity: 0.7 }}>
                {report.dog_name}&apos;s mood today
              </p>
            </div>
          </motion.div>
        )}

        {cleanNotes && (
          <motion.div
            style={{ padding: '14px 18px', background: 'oklch(0.995 0.005 85)', borderRadius: 16, border: '1px solid rgba(10,47,53,0.06)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.5, ease: EASE }}>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#374151', fontStyle: 'italic', lineHeight: 1.65, margin: '0 0 6px' }}>
              &ldquo;{cleanNotes}&rdquo;
            </p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0, textAlign: 'right' }}>
              — {report.provider_name}
            </p>
          </motion.div>
        )}
      </div>

      {/* ── SHARE SECTION ────────────────────────────────────── */}
      <motion.div
        style={{ margin: '8px 20px 16px', background: 'oklch(0.995 0.005 85)', borderRadius: 20, padding: 16, boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), 0 4px 16px rgba(15,45,50,0.07)', border: '1px solid rgba(226,220,200,0.7)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28, ease: EASE }}>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', margin: '0 0 12px' }}>
          Share this report
        </p>

        {/* WhatsApp family */}
        <motion.a
          href={`https://wa.me/?text=${waFamilyText}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl text-sm font-bold text-white mb-2.5"
          style={{ background: 'linear-gradient(160deg, #25D366 0%, #1aad54 100%)', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -4px 0 rgba(14,100,55,0.50), 0 8px 20px rgba(37,211,102,0.28)', textDecoration: 'none', fontFamily: 'var(--font-fredoka)', fontSize: 16 }}
          whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.845L.057 23.428a.5.5 0 00.609.61l5.64-1.476A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.91 0-3.698-.5-5.244-1.373l-.375-.217-3.888 1.018 1.034-3.774-.237-.389A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
          Send to family
        </motion.a>

        <div className="grid grid-cols-2 gap-2">
          <motion.a
            href={`https://wa.me/?text=${waVetText}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold"
            style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid rgba(226,220,200,0.7)', color: '#0A2F35', textDecoration: 'none', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.95), 0 3px 8px rgba(0,0,0,0.05)', fontFamily: 'var(--font-nunito)', fontWeight: 700 }}
            whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
            Send to vet
          </motion.a>
          <motion.button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold"
            style={{ background: copied ? '#ECFDF5' : 'oklch(0.995 0.005 85)', border: copied ? '1px solid #BBF7D0' : '1px solid rgba(226,220,200,0.7)', color: copied ? '#15803D' : '#0A2F35', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.95), 0 3px 8px rgba(0,0,0,0.05)', fontFamily: 'var(--font-nunito)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}
            whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
            <AnimatePresence mode="wait">
              {copied
                ? <motion.span key="copied" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>Copied!</motion.span>
                : <motion.span key="copy" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>Copy link</motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <div style={{ padding: '12px 20px 40px', textAlign: 'center', borderTop: '1px solid rgba(10,47,53,0.06)' }}>
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
