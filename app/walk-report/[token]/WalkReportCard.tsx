'use client'

import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
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

// ── Count-up from 0 to target on mount ────────────────────────
function useCountUp(target: number, duration = 700, startDelay = 400) {
  const [value, setValue] = useState(0)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (prefersReduced || target === 0) { setValue(target); return }
    const timer = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 4) // ease-out-quart
        setValue(Math.round(eased * target))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, startDelay)
    return () => clearTimeout(timer)
  }, [target, duration, startDelay, prefersReduced])

  return value
}

// ── Paw prints that burst from center on load ─────────────────
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
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {paws.map((paw, i) => (
        <motion.span
          key={i}
          className="absolute select-none"
          style={{ fontSize: paw.size, top: '28%' }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.2, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: paw.x,
            y: paw.y,
            scale: [0.2, 1.1, 1, 0.75],
            rotate: paw.r,
          }}
          transition={{ duration: 1.05, delay: paw.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          🐾
        </motion.span>
      ))}
    </div>
  )
}

// ── Animated stat pill with count-up and finish wiggle ────────
function StatPill({
  emoji, count, singular, plural, unit,
  bg, color, delay,
}: {
  emoji: string; count: number; singular?: string; plural?: string; unit?: string
  bg: string; color: string; delay: number
}) {
  const animated = useCountUp(count, 680, delay)
  const finished = animated === count && count > 0
  const prefersReduced = useReducedMotion()

  const label = unit
    ? `${animated} ${unit}`
    : `${animated} ${animated === 1 ? singular : plural}`

  return (
    <motion.span
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold select-none"
      style={{ background: bg, color }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.38, delay: delay / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <motion.span
        animate={finished && !prefersReduced ? { rotate: [0, -8, 8, -5, 3, 0] } : {}}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ display: 'inline-block' }}
      >
        {emoji}
      </motion.span>
      {label}
    </motion.span>
  )
}

// ── WhatsApp SVG icon ──────────────────────────────────────────
function WAIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.845L.057 23.428a.5.5 0 00.609.61l5.64-1.476A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.91 0-3.698-.5-5.244-1.373l-.375-.217-3.888 1.018 1.034-3.774-.237-.389A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  )
}

// ── Walk map (unchanged functionality, added motion wrapper) ───
function WalkMap({ routePoints, poopEvents, peeEvents }: {
  routePoints: { lat: number; lng: number }[]
  poopEvents: { lat: number; lng: number; time: string }[]
  peeEvents: { lat: number; lng: number; time: string }[]
}) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!routePoints?.length || !mapRef.current) return

    function initMap() {
      const map = new (window as any).google.maps.Map(mapRef.current, {
        zoom: 15,
        center: routePoints[0],
        disableDefaultUI: true,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { elementType: 'geometry', stylers: [{ color: '#f5f0e8' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8e0' }] },
        ],
      })

      new (window as any).google.maps.Polyline({
        path: routePoints,
        strokeColor: '#0f766e',
        strokeWeight: 5,
        strokeOpacity: 0.85,
        geodesic: true,
      }).setMap(map)

      new (window as any).google.maps.Marker({
        position: routePoints[0], map,
        icon: { path: (window as any).google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#22c55e', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 },
        title: 'Start',
      })
      new (window as any).google.maps.Marker({
        position: routePoints[routePoints.length - 1], map,
        icon: { path: (window as any).google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#0f766e', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 },
        title: 'End',
      })

      poopEvents?.forEach((e, i) => {
        new (window as any).google.maps.Marker({
          position: { lat: e.lat, lng: e.lng }, map,
          label: { text: '💩', fontSize: '18px' },
          icon: { path: (window as any).google.maps.SymbolPath.CIRCLE, scale: 0 },
          title: `Poop ${i + 1}`,
        })
      })
      peeEvents?.forEach((e, i) => {
        new (window as any).google.maps.Marker({
          position: { lat: e.lat, lng: e.lng }, map,
          label: { text: '💧', fontSize: '18px' },
          icon: { path: (window as any).google.maps.SymbolPath.CIRCLE, scale: 0 },
          title: `Pee ${i + 1}`,
        })
      })

      const bounds = new (window as any).google.maps.LatLngBounds()
      routePoints.forEach(p => bounds.extend(p))
      map.fitBounds(bounds, { top: 20, bottom: 20, left: 20, right: 20 })
    }

    if ((window as any).google?.maps) {
      initMap()
    } else {
      if (document.querySelector('script[data-gm]')) {
        const check = setInterval(() => {
          if ((window as any).google?.maps) { clearInterval(check); initMap() }
        }, 100)
        return
      }
      const script = document.createElement('script')
      script.setAttribute('data-gm', '1')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      script.onload = initMap
      document.head.appendChild(script)
    }
  }, [routePoints, poopEvents, peeEvents])

  return <div ref={mapRef} className="w-full rounded-2xl overflow-hidden" style={{ height: 260 }} />
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const
const CLAY_CARD = {
  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
  border: '1px solid rgba(226,220,200,0.7)',
}

export default function WalkReportCard({
  report,
  isOwner,
}: {
  report: WalkReport
  isOwner: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [burst, setBurst] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const prefersReduced = useReducedMotion()

  // Track parent view on mount — both systems
  useEffect(() => {
    // Old: fires push notification to provider
    fetch('/api/care-card-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: report.token, type: 'walk' }),
    }).catch(() => {})
    // New: funnel analytics
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'report_viewed', report_token: report.token }),
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Set share URL client-side only
  useEffect(() => {
    setShareUrl(window.location.href.split('?')[0])
  }, [])

  // Detect ?saved=1 after OAuth claim redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('saved') === '1') {
      setJustSaved(true)
      // Clean the URL without reloading
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Trigger paw burst shortly after mount
  useEffect(() => {
    if (prefersReduced) return
    const t = setTimeout(() => setBurst(true), 180)
    return () => clearTimeout(t)
  }, [prefersReduced])

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  const waFamilyText = encodeURIComponent(
    `${report.dog_name} just had an amazing walk! 🐾\nFull report here:\n${shareUrl}`
  )
  const waVetText = encodeURIComponent(
    `Hi Doctor, here is ${report.dog_name}'s recent walk report from PupStep 🏥\n${shareUrl}`
  )

  return (
    <div
      className="min-h-dvh flex flex-col items-center px-4 py-8"
      style={{ background: 'oklch(0.975 0.006 85)' }}
    >
      {/* Paw burst celebration */}
      <AnimatePresence>
        {burst && <PawBurst />}
      </AnimatePresence>

      <div className="w-full max-w-lg">

        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <Link href="/" className="flex items-center">
            <Image src="/logo.webp" alt="PupStep" width={140} height={52} className="h-10 w-auto" />
          </Link>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'oklch(0.48 0.17 196)' }}>
            Walk Report
          </span>
        </motion.div>

        {/* ── Walker info ─────────────────────────────────────── */}
        <motion.div
          className="mb-5 flex items-center gap-2.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.07, ease: EASE }}
        >
          <div>
            <p className="text-xs text-stone-400 mb-0.5">Walker</p>
            <h1 className="font-display text-2xl text-stone-900 leading-tight">
              {report.provider_name}
            </h1>
          </div>
          {report.is_verified && (
            <motion.span
              className="ml-auto flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: 'oklch(0.48 0.17 196 / 0.1)',
                color: 'oklch(0.48 0.17 196)',
                border: '1px solid oklch(0.48 0.17 196 / 0.25)',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2, ease: EASE }}
            >
              ✓ Verified
            </motion.span>
          )}
        </motion.div>

        {/* ── Main card ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: EASE }}
          className="rounded-3xl overflow-hidden"
          style={CLAY_CARD}
        >
          <div className="p-6">

            {/* Dog name */}
            <motion.div
              className="flex items-center gap-2 mb-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.2, ease: EASE }}
            >
              <motion.span
                className="text-3xl"
                animate={!prefersReduced ? { rotate: [0, -10, 10, -6, 0] } : {}}
                transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
                style={{ display: 'inline-block' }}
              >
                🐕
              </motion.span>
              <h2 className="font-display text-3xl text-stone-900 leading-tight">
                {report.dog_name}
              </h2>
            </motion.div>

            {/* Date + Duration */}
            <motion.div
              className="flex flex-wrap gap-x-6 gap-y-2 mb-5 text-sm text-stone-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.25, ease: EASE }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Date & Time</p>
                <p className="font-medium text-stone-700">{formatWalkDate(report.walk_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Duration</p>
                <p className="font-medium text-stone-700">{report.duration_mins} mins</p>
              </div>
            </motion.div>

            {/* Activity pills — count up on load */}
            <div className="flex flex-wrap gap-2.5 mb-5">
              <StatPill
                emoji="💩" count={report.poop_count}
                singular="poop" plural="poops"
                bg="#FEF3C7" color="#92400E" delay={450}
              />
              <StatPill
                emoji="💧" count={report.pee_count}
                singular="pee" plural="pees"
                bg="#EFF6FF" color="#1E40AF" delay={560}
              />
              {report.duration_mins > 0 && (
                <StatPill
                  emoji="⏱" count={report.duration_mins}
                  unit="mins"
                  bg="#F0FDF4" color="#166534" delay={660}
                />
              )}
              {report.distance_meters && report.distance_meters > 0 && !report.route_points?.length && (
                <motion.span
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold"
                  style={{ background: '#FDF4FF', color: '#6B21A8' }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.38, delay: 0.75, ease: EASE }}
                >
                  📏 {(report.distance_meters / 1000).toFixed(2)} km
                </motion.span>
              )}
            </div>

            {/* GPS route map */}
            {report.route_points && report.route_points.length >= 2 && (
              <motion.div
                className="mb-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
              >
                <WalkMap
                  routePoints={report.route_points}
                  poopEvents={report.poop_events ?? []}
                  peeEvents={report.pee_events ?? []}
                />
                {report.distance_meters && report.distance_meters > 0 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span className="text-xs text-stone-400">📏</span>
                    <span className="text-xs font-semibold text-stone-500">
                      {report.distance_meters >= 1000
                        ? `${(report.distance_meters / 1000).toFixed(2)} km`
                        : `${Math.round(report.distance_meters)} m`}
                    </span>
                    <span className="text-stone-200">·</span>
                    <span className="text-xs text-stone-400">GPS tracked</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Static route map (start/end text) */}
            {report.start_location && report.end_location && (
              <motion.div
                className="rounded-2xl overflow-hidden border border-amber-100/60 mb-5"
                style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.38, ease: EASE }}
              >
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?size=600x200&scale=2&maptype=roadmap&markers=color:0x0f766e|label:S|${encodeURIComponent(report.start_location + ', Juhu, Mumbai')}&markers=color:0xF59E0B|label:F|${encodeURIComponent(report.end_location + ', Juhu, Mumbai')}&style=feature:all|element:labels.text.fill|color:0x64748b&style=feature:road|element:geometry|color:0xfef3c7&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                  alt="Walk route map"
                  className="w-full object-cover"
                  style={{ height: 140 }}
                />
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-0.5">Route</p>
                    <p className="text-sm font-semibold text-stone-800 truncate">{report.start_location}</p>
                  </div>
                  <span className="text-amber-400 font-bold text-lg flex-shrink-0">→</span>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-0.5">&nbsp;</p>
                    <p className="text-sm font-semibold text-stone-800 truncate">{report.end_location}</p>
                  </div>
                  <span className="text-xl">🏁</span>
                </div>
              </motion.div>
            )}

            {/* Walker notes */}
            {report.notes && (
              <motion.div
                className="rounded-xl px-4 py-3 mb-5"
                style={{ background: 'rgba(15,45,50,0.04)', border: '1px solid rgba(15,45,50,0.06)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.42, ease: EASE }}
              >
                <p className="text-sm text-stone-600 italic leading-relaxed">
                  &ldquo;{report.notes}&rdquo;
                </p>
              </motion.div>
            )}
          </div>

          {/* Dog photo — full bleed */}
          {report.photo_url && (
            <motion.div
              className="relative w-full aspect-[4/3] bg-stone-100"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.3, ease: EASE }}
            >
              <Image
                src={report.photo_url}
                alt={`${report.dog_name} on their walk`}
                fill
                className="object-cover"
                sizes="(max-width: 512px) 100vw, 512px"
              />
            </motion.div>
          )}
        </motion.div>

        {/* ── Share section ───────────────────────────────────── */}
        <motion.div
          className="mt-4 rounded-2xl p-4"
          style={CLAY_CARD}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28, ease: EASE }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">
            Share this report
          </p>

          {/* WhatsApp — send to family */}
          <motion.a
            href={`https://wa.me/?text=${waFamilyText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl text-sm font-bold text-white mb-2.5"
            style={{
              background: 'linear-gradient(160deg, #25D366 0%, #1aad54 100%)',
              boxShadow:
                'inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -4px 0 rgba(14,100,55,0.50), 0 10px 24px rgba(37,211,102,0.32)',
            }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.12 }}
          >
            <WAIcon className="w-5 h-5 flex-shrink-0" />
            Send to family
          </motion.a>

          {/* Row: vet + copy link */}
          <div className="grid grid-cols-2 gap-2">
            <motion.a
              href={`https://wa.me/?text=${waVetText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold"
              style={{
                background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                boxShadow:
                  'inset 0 1.5px 0 rgba(255,255,255,0.95), inset 0 -2.5px 0 rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.06)',
                border: '1px solid rgba(226,220,200,0.7)',
                color: '#1a2233',
              }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.12 }}
            >
              🏥 Send to vet
            </motion.a>

            <motion.button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-colors"
              style={{
                background: copied
                  ? 'linear-gradient(160deg, #ECFDF5 0%, #D1FAE5 100%)'
                  : 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                boxShadow:
                  'inset 0 1.5px 0 rgba(255,255,255,0.95), inset 0 -2.5px 0 rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.06)',
                border: copied ? '1px solid #BBF7D0' : '1px solid rgba(226,220,200,0.7)',
                color: copied ? '#15803D' : '#1a2233',
              }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.12 }}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: EASE }}
                  >
                    ✓ Copied!
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: EASE }}
                  >
                    🔗 Copy link
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>

        {/* ── Owner confirmation OR viral hook (never both) ──── */}
        {isOwner ? (
          /* Owner: show a reassuring confirmation strip */
          <motion.div
            className="mt-3 rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <span className="text-xl">{justSaved ? '🎉' : '✓'}</span>
            <div>
              <p className="text-sm font-semibold text-green-800">
                {justSaved ? 'Saved to your account!' : 'Reports arrive automatically'}
              </p>
              <p className="text-xs text-green-600 leading-snug">
                {justSaved
                  ? `Every walk report for ${report.dog_name} will be here — no action needed.`
                  : 'Every walk gets delivered to your PupStep account'}
              </p>
            </div>
          </motion.div>
        ) : (
          /* Stranger: save prompt */
          <motion.div
            className="mt-3 rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, oklch(0.94 0.06 196) 0%, oklch(0.90 0.08 196) 100%)',
              border: '1.5px solid oklch(0.82 0.10 196)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5, ease: EASE }}
          >
            <div className="p-5">
              <p className="text-sm font-semibold text-stone-700 mb-3">
                Save {report.dog_name}&apos;s reports to your account — every walk, automatically.
              </p>
              <motion.button
                onClick={async () => {
                  fetch('/api/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event_type: 'viral_hook_tapped', report_token: report.token }),
                  }).catch(() => {})
                  const supabase = createClient()
                  const { data: { user } } = await supabase.auth.getUser()
                  const claimPath = `/api/claim-report/${report.token}`
                  if (user) {
                    window.location.href = claimPath
                  } else {
                    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(claimPath)}`
                    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
                  }
                }}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm"
                style={{ background: 'oklch(0.48 0.17 196)', boxShadow: '0 3px 0 oklch(0.35 0.14 196)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12 }}
              >
                Save to my account →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Footer ─────────────────────────────────────────── */}
        <motion.div
          className="mt-6 pb-2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45, ease: EASE }}
        >
          <p className="text-xs text-stone-400">Shared via PupStep · Juhu, Mumbai</p>
        </motion.div>

      </div>
    </div>
  )
}
