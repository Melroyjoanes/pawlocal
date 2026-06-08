'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRef, useEffect } from 'react'

// Run this in Supabase SQL editor:
// ALTER TABLE walk_reports ADD COLUMN start_location text;
// ALTER TABLE walk_reports ADD COLUMN end_location text;

type WalkReport = {
  id: string
  token: string
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
  route_points: {lat: number, lng: number}[] | null
  distance_meters: number | null
  poop_events: {lat: number, lng: number, time: string}[] | null
  pee_events: {lat: number, lng: number, time: string}[] | null
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

function WalkMap({ routePoints, poopEvents, peeEvents }: {
  routePoints: {lat: number, lng: number}[]
  poopEvents: {lat: number, lng: number, time: string}[]
  peeEvents: {lat: number, lng: number, time: string}[]
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

      // Draw route as teal polyline
      new (window as any).google.maps.Polyline({
        path: routePoints,
        strokeColor: '#0f766e',
        strokeWeight: 5,
        strokeOpacity: 0.85,
        geodesic: true,
      }).setMap(map)

      // Start marker — green dot
      new (window as any).google.maps.Marker({
        position: routePoints[0],
        map,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#22c55e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Start',
      })

      // End marker — teal dot
      new (window as any).google.maps.Marker({
        position: routePoints[routePoints.length - 1],
        map,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#0f766e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'End',
      })

      // Poop markers — emoji label markers
      poopEvents?.forEach((e, i) => {
        new (window as any).google.maps.Marker({
          position: { lat: e.lat, lng: e.lng },
          map,
          label: { text: '💩', fontSize: '18px' },
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 0,
          },
          title: `Poop ${i + 1}`,
        })
      })

      // Pee markers — emoji label markers
      peeEvents?.forEach((e, i) => {
        new (window as any).google.maps.Marker({
          position: { lat: e.lat, lng: e.lng },
          map,
          label: { text: '💧', fontSize: '18px' },
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 0,
          },
          title: `Pee ${i + 1}`,
        })
      })

      // Fit all route points in view
      const bounds = new (window as any).google.maps.LatLngBounds()
      routePoints.forEach(p => bounds.extend(p))
      map.fitBounds(bounds, { top: 20, bottom: 20, left: 20, right: 20 })
    }

    if ((window as any).google?.maps) {
      initMap()
    } else {
      // Check if script already loading
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

  return (
    <div
      ref={mapRef}
      className="w-full rounded-2xl overflow-hidden"
      style={{ height: 260 }}
    />
  )
}

const CLAY_CARD = {
  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
  boxShadow:
    'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
  border: '1px solid rgba(226,220,200,0.7)',
}

export default function WalkReportCard({ report }: { report: WalkReport }) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center px-4 py-8"
      style={{ background: 'oklch(0.975 0.006 85)' }}
    >
      <div className="w-full max-w-lg">

        {/* Header — logo + label */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <span className="font-display text-xl text-stone-900 leading-none">
              Paw<span style={{ color: '#D97706' }}>Local</span>
            </span>
          </Link>
          <span
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: 'oklch(0.48 0.17 196)' }}
          >
            Walk Report
          </span>
        </div>

        {/* Walker info */}
        <div className="mb-5 flex items-center gap-2.5">
          <div>
            <p className="text-xs text-stone-400 mb-0.5">Walker</p>
            <h1 className="font-display text-2xl text-stone-900 leading-tight">
              {report.provider_name}
            </h1>
          </div>
          {report.is_verified && (
            <span
              className="ml-auto flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: 'oklch(0.48 0.17 196 / 0.1)',
                color: 'oklch(0.48 0.17 196)',
                border: '1px solid oklch(0.48 0.17 196 / 0.25)',
              }}
            >
              ✓ Verified
            </span>
          )}
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-3xl overflow-hidden"
          style={CLAY_CARD}
        >
          <div className="p-6">

            {/* Dog name */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-3xl">🐕</span>
              <h2 className="font-display text-3xl text-stone-900 leading-tight">
                {report.dog_name}
              </h2>
            </div>

            {/* Date + Duration */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 text-sm text-stone-500">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Date & Time</p>
                <p className="font-medium text-stone-700">{formatWalkDate(report.walk_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Duration</p>
                <p className="font-medium text-stone-700">{report.duration_mins} mins</p>
              </div>
            </div>

            {/* Activity pills */}
            <div className="flex gap-2.5 mb-5">
              <span
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: '#FEF3C7', color: '#92400E' }}
              >
                💩 {report.poop_count} {report.poop_count === 1 ? 'poop' : 'poops'}
              </span>
              <span
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: '#EFF6FF', color: '#1E40AF' }}
              >
                💧 {report.pee_count} {report.pee_count === 1 ? 'pee' : 'pees'}
              </span>
              {report.distance_meters && report.distance_meters > 0 && !report.route_points?.length && (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold"
                  style={{ background: '#F0FDF4', color: '#166534' }}>
                  📏 {(report.distance_meters / 1000).toFixed(2)} km
                </span>
              )}
            </div>

            {/* Route map — only show if we have GPS data (at least 2 points) */}
            {report.route_points && report.route_points.length >= 2 && (
              <div className="mb-5">
                <WalkMap
                  routePoints={report.route_points}
                  poopEvents={report.poop_events ?? []}
                  peeEvents={report.pee_events ?? []}
                />
                {/* Distance stat below map */}
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
              </div>
            )}

            {/* Route */}
            {report.start_location && report.end_location && (
              <div className="rounded-2xl overflow-hidden border border-amber-100/60 mb-5"
                style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' }}>
                {/* Google Maps Static API image */}
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?size=600x200&scale=2&maptype=roadmap&markers=color:0x0f766e|label:S|${encodeURIComponent(report.start_location + ', Juhu, Mumbai')}&markers=color:0xF59E0B|label:F|${encodeURIComponent(report.end_location + ', Juhu, Mumbai')}&style=feature:all|element:labels.text.fill|color:0x64748b&style=feature:road|element:geometry|color:0xfef3c7&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                  alt="Walk route map"
                  className="w-full object-cover"
                  style={{ height: 140 }}
                />
                {/* Route text below the map */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-0.5">Route</p>
                    <p className="text-sm font-semibold text-stone-800 truncate">{report.start_location}</p>
                  </div>
                  <span className="text-amber-400 font-bold text-lg flex-shrink-0">→</span>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-0.5"> </p>
                    <p className="text-sm font-semibold text-stone-800 truncate">{report.end_location}</p>
                  </div>
                  <span className="text-xl">🏁</span>
                </div>
              </div>
            )}

            {/* Notes */}
            {report.notes && (
              <div
                className="rounded-xl px-4 py-3 mb-5"
                style={{ background: 'rgba(15,45,50,0.04)', border: '1px solid rgba(15,45,50,0.06)' }}
              >
                <p className="text-sm text-stone-600 italic leading-relaxed">
                  &ldquo;{report.notes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Photo — full bleed inside card, no padding */}
          {report.photo_url && (
            <div className="relative w-full aspect-[4/3] bg-stone-100">
              <Image
                src={report.photo_url}
                alt={`${report.dog_name} on their walk`}
                fill
                className="object-cover"
                sizes="(max-width: 512px) 100vw, 512px"
              />
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-stone-400">
            Shared via PawLocal · Juhu, Mumbai
          </p>
          <Link
            href="/search"
            className="text-sm font-semibold transition-colors"
            style={{ color: 'oklch(0.48 0.17 196)' }}
          >
            Find a pet care provider →
          </Link>
        </div>

      </div>
    </div>
  )
}
