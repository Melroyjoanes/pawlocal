'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

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
            </div>

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
