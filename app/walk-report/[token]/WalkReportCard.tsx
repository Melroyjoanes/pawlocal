'use client'

import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

function formatWalkDate(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    const day = d.toLocaleDateString('en-IN', { weekday: 'long' })
    const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${day}, ${date} · ${time}`
  } catch {
    return isoDate
  }
}

function formatDateShort(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · ' +
      d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch { return '' }
}

// Count-up from 0 to target
function useCountUp(target: number, duration = 700, startDelay = 400) {
  const [value, setValue] = useState(0)
  const prefersReduced = useReducedMotion()
  useEffect(() => {
    if (prefersReduced || target === 0) { setValue(target); return }
    const timer = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 4)
        setValue(Math.round(eased * target))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, startDelay)
    return () => clearTimeout(timer)
  }, [target, duration, startDelay, prefersReduced])
  return value
}

// Paw burst
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
      {paws.map((paw, i) => (
        <motion.span key={i} className="absolute select-none" style={{ fontSize: paw.size }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.2, rotate: 0 }}
          animate={{ opacity: [0, 1, 1, 0], x: paw.x, y: paw.y, scale: [0.2, 1.1, 1, 0.75], rotate: paw.r }}
          transition={{ duration: 1.05, delay: paw.delay, ease: [0.25, 0.46, 0.45, 0.94] }}>
          🐾
        </motion.span>
      ))}
    </div>
  )
}

// Animated stat pill
function StatPill({ emoji, count, singular, plural, unit, bg, color, delay }: {
  emoji: string; count: number; singular?: string; plural?: string; unit?: string
  bg: string; color: string; delay: number
}) {
  const animated = useCountUp(count, 680, delay)
  const finished = animated === count && count > 0
  const prefersReduced = useReducedMotion()
  const label = unit ? `${animated} ${unit}` : `${animated} ${animated === 1 ? singular : plural}`
  return (
    <motion.span
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold select-none"
      style={{ background: bg, color }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.38, delay: delay / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}>
      <motion.span
        animate={finished && !prefersReduced ? { rotate: [0, -8, 8, -5, 3, 0] } : {}}
        transition={{ duration: 0.45 }}
        style={{ display: 'inline-block' }}>
        {emoji}
      </motion.span>
      {label}
    </motion.span>
  )
}

// Full-width GPS map — edge to edge, 320px tall
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

      // Teal route polyline
      new gm.Polyline({
        path: routePoints,
        strokeColor: 'oklch(0.48 0.17 196)',
        strokeWeight: 6,
        strokeOpacity: 0.9,
        geodesic: true,
      }).setMap(map)

      // Start marker (green)
      new gm.Marker({
        position: routePoints[0], map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 11, fillColor: '#22c55e', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 },
        title: 'Start',
        zIndex: 10,
      })

      // End marker (teal)
      new gm.Marker({
        position: routePoints[routePoints.length - 1], map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 11, fillColor: '#0f766e', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 },
        title: 'End',
        zIndex: 10,
      })

      // Poop/pee emoji markers
      poopEvents?.forEach((e, i) => {
        new gm.Marker({
          position: { lat: e.lat, lng: e.lng }, map,
          label: { text: '💩', fontSize: '18px' },
          icon: { path: gm.SymbolPath.CIRCLE, scale: 0 },
          title: `Poop ${i + 1}`, zIndex: 5,
        })
      })
      peeEvents?.forEach((e, i) => {
        new gm.Marker({
          position: { lat: e.lat, lng: e.lng }, map,
          label: { text: '💧', fontSize: '18px' },
          icon: { path: gm.SymbolPath.CIRCLE, scale: 0 },
          title: `Pee ${i + 1}`, zIndex: 5,
        })
      })

      // Fit all route points in view with padding
      const bounds = new gm.LatLngBounds()
      routePoints.forEach(p => bounds.extend(p))
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

const EASE = [0.25, 0.46, 0.45, 0.94] as const

export default function WalkReportCard({
  report,
  isOwner,
  isFirstReport,
}: {
  report: WalkReport
  isOwner: boolean
  isFirstReport: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [burst, setBurst] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    fetch('/api/care-card-view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: report.token, type: 'walk' }) }).catch(() => {})
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'report_viewed', report_token: report.token }) }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setShareUrl(window.location.href.split('?')[0]) }, [])

  useEffect(() => {
    if (prefersReduced) return
    const t = setTimeout(() => setBurst(true), 300)
    return () => clearTimeout(t)
  }, [prefersReduced])

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  // Extract mood from notes
  const notes = report.notes ?? ''
  const moodMatch = notes.match(/\[Mood:\s*([\S]+)\s+(\w+)\]/)
  const mood = moodMatch ? { emoji: moodMatch[1], label: moodMatch[2] } : null
  const cleanNotes = notes.replace(/\[Mood:[^\]]+\]\s*/g, '').trim()

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
  const waVetText = encodeURIComponent(`Hi Doctor, here is ${report.dog_name}'s recent walk report:\n${shareUrl}`)

  const hasMap = report.route_points && report.route_points.length >= 2

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFBEB' }}>
      <AnimatePresence>{burst && <PawBurst />}</AnimatePresence>

      {/* ── FIRST REPORT CELEBRATION ──────────────────────────── */}
      {isFirstReport && (
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ background: 'linear-gradient(135deg, oklch(0.48 0.17 196) 0%, oklch(0.38 0.15 196) 100%)', padding: '20px 20px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>🎉 First walk report!</p>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '0 0 14px', lineHeight: 1.5 }}>
            {report.dog_name}&apos;s care diary has started.
          </p>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Hi! Please use PupStep after every walk with ${report.dog_name}. It only takes 2 minutes! 🐾`)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 100, padding: '8px 20px', fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            📲 Ask walker to do this daily
          </a>
        </motion.div>
      )}

      {/* ── HERO: Dog photo fills the screen ─────────────────── */}
      <div style={{ position: 'relative', width: '100%', height: report.photo_url ? '45vh' : 120, minHeight: report.photo_url ? 280 : 0, maxHeight: report.photo_url ? 420 : 120, overflow: 'hidden' }}>
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
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 40%, rgba(10,47,53,0.8) 100%)' }} />
        )}
        {/* Logo top-left */}
        <div style={{ position: 'absolute', top: 14, left: 16 }}>
          <Link href="/">
            <span style={{ fontFamily: 'var(--font-fredoka)', fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>PupStep 🐾</span>
          </Link>
        </div>
        {/* Walk Report label top-right */}
        <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-nunito)', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          Walk Report
        </span>
        {/* Dog name + date over photo */}
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

      {/* ── DOG NAME (when no photo) ──────────────────────────── */}
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
                ✓ Verified
              </span>
            )}
          </div>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#9CA3AF', margin: 0 }}>
            {formatWalkDate(report.walk_date)} · {report.provider_name}
          </p>
        </motion.div>
      )}

      {/* ── STAT PILLS ────────────────────────────────────────── */}
      <motion.div
        style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25, ease: EASE }}>
        <StatPill emoji="💩" count={report.poop_count} singular="poop" plural="poops" bg="#FEF3C7" color="#92400E" delay={400} />
        <StatPill emoji="💧" count={report.pee_count} singular="pee" plural="pees" bg="#EFF6FF" color="#1E40AF" delay={520} />
        {report.duration_mins > 0 && (
          <StatPill emoji="⏱" count={report.duration_mins} unit="mins" bg="#F0FDF4" color="#166534" delay={640} />
        )}
        {report.distance_meters && report.distance_meters > 0 && (
          <motion.span
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600, background: '#F5F3FF', color: '#6B21A8', fontFamily: 'var(--font-nunito)', userSelect: 'none' }}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.75, ease: EASE }}>
            📏 {report.distance_meters >= 1000 ? `${(report.distance_meters / 1000).toFixed(2)} km` : `${Math.round(report.distance_meters)} m`}
          </motion.span>
        )}
      </motion.div>

      {/* ── GPS MAP — full width, edge to edge, 320px ─────────── */}
      {hasMap ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: EASE }}>
          {/* Map label */}
          <div style={{ padding: '4px 20px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-fredoka)', fontSize: 15, fontWeight: 700, color: '#0A2F35' }}>GPS Route</span>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-nunito)', fontWeight: 600 }}>
              · {(report.poop_events?.length ?? 0) + (report.pee_events?.length ?? 0)} events mapped
            </span>
          </div>
          {/* Map: full width, no border-radius, edge to edge */}
          <div style={{ width: '100%', height: 320, position: 'relative', background: '#f5f0e8' }}>
            <WalkMap
              routePoints={report.route_points!}
              poopEvents={report.poop_events ?? []}
              peeEvents={report.pee_events ?? []}
            />
            {/* Legend overlay */}
            <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '6px 10px', display: 'flex', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>● Start</span>
              <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 700, fontFamily: 'var(--font-nunito)' }}>● End</span>
              {(report.poop_events?.length ?? 0) > 0 && <span style={{ fontSize: 11 }}>💩 ×{report.poop_events!.length}</span>}
              {(report.pee_events?.length ?? 0) > 0 && <span style={{ fontSize: 11 }}>💧 ×{report.pee_events!.length}</span>}
            </div>
          </div>
        </motion.div>
      ) : (
        <div style={{ padding: '0 20px 4px' }}>
          <div style={{ background: '#F1F5F9', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📍</span>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: 0 }}>
              GPS route not available for this walk
            </p>
          </div>
        </div>
      )}

      {/* ── MOOD + NOTES ──────────────────────────────────────── */}
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

      {/* ── SHARE SECTION ─────────────────────────────────────── */}
      <motion.div
        style={{ margin: '8px 20px 16px', background: 'oklch(0.995 0.005 85)', borderRadius: 20, padding: 16, boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), 0 4px 16px rgba(15,45,50,0.07)', border: '1px solid rgba(226,220,200,0.7)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28, ease: EASE }}>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', margin: '0 0 12px' }}>
          Share this report
        </p>

        {/* WhatsApp family — primary */}
        <motion.a
          href={`https://wa.me/?text=${waFamilyText}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl text-sm font-bold text-white mb-2.5"
          style={{ background: 'linear-gradient(160deg, #25D366 0%, #1aad54 100%)', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -4px 0 rgba(14,100,55,0.50), 0 8px 20px rgba(37,211,102,0.28)', textDecoration: 'none', fontFamily: 'var(--font-fredoka)', fontSize: 16 }}
          whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.845L.057 23.428a.5.5 0 00.609.61l5.64-1.476A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.91 0-3.698-.5-5.244-1.373l-.375-.217-3.888 1.018 1.034-3.774-.237-.389A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Send to family
        </motion.a>

        {/* Vet + Copy link */}
        <div className="grid grid-cols-2 gap-2">
          <motion.a
            href={`https://wa.me/?text=${waVetText}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold"
            style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid rgba(226,220,200,0.7)', color: '#0A2F35', textDecoration: 'none', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.95), 0 3px 8px rgba(0,0,0,0.05)', fontFamily: 'var(--font-nunito)', fontWeight: 700 }}
            whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
            🏥 Send to vet
          </motion.a>
          <motion.button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-colors"
            style={{ background: copied ? '#ECFDF5' : 'oklch(0.995 0.005 85)', border: copied ? '1px solid #BBF7D0' : '1px solid rgba(226,220,200,0.7)', color: copied ? '#15803D' : '#0A2F35', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.95), 0 3px 8px rgba(0,0,0,0.05)', fontFamily: 'var(--font-nunito)', fontWeight: 700, cursor: 'pointer' }}
            whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}>
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="copied" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>✓ Copied!</motion.span>
              ) : (
                <motion.span key="copy" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>🔗 Copy link</motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* ── DELIVERY CONFIRMATION ─────────────────────────────── */}
      <motion.div
        className="mx-5 mb-4 rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}>
        <span style={{ fontSize: 18 }}>✓</span>
        <div>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: '#166534', margin: 0 }}>
            Report delivered to {report.dog_name}&apos;s owner
          </p>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#16a34a', margin: '2px 0 0' }}>
            Share the buttons above with family or your vet
          </p>
        </div>
      </motion.div>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <div style={{ padding: '8px 20px 40px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', margin: 0 }}>
          Shared via PupStep · Juhu, Mumbai 🐾
        </p>
      </div>
    </div>
  )
}
