'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type WalkReport = {
  id: string
  token: string
  dog_name: string
  duration_mins: number
  poop_count: number
  pee_count: number
  notes: string | null
  photo_url: string | null
  walk_date: string
  created_at: string
  start_location: string | null
  end_location: string | null
  route_points?: { lat: number; lng: number }[] | null
  distance_meters?: number | null
  poop_events?: { lat: number; lng: number; time: string }[] | null
  pee_events?: { lat: number; lng: number; time: string }[] | null
}

type Props = {
  initialReports: WalkReport[]
  providerId: string
  providerName: string
  verificationTier: string | null
  hideHeader?: boolean
}

const EASE_OUT = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } as const

const CLAY_CARD: React.CSSProperties = {
  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
  border: '1px solid rgba(226,220,200,0.7)',
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function shareUrl(token: string): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/walk-report/${token}`
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({ report, onDelete }: { report: WalkReport; onDelete: (id: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleCopy() {
    const url = shareUrl(report.token)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    onDelete(report.id)
    try {
      await fetch(`/api/walk-reports/${report.token}`, { method: 'DELETE' })
    } catch {
      // optimistic — already removed
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={EASE_OUT}
      className="rounded-2xl overflow-hidden"
      style={CLAY_CARD}
    >
      <div className="flex gap-3 p-4">
        {report.photo_url ? (
          <img src={report.photo_url} alt={report.dog_name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
            style={{ background: 'oklch(0.48 0.17 196 / 0.08)' }}>
            🐾
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base text-stone-900 leading-tight truncate">{report.dog_name}</h3>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors text-sm font-bold"
              aria-label="Delete report"
            >✕</button>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">{formatDate(report.walk_date)}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-stone-500">
            <span>⏱ {report.duration_mins} min</span>
            {report.poop_count > 0 && <span>💩 ×{report.poop_count}</span>}
            {report.pee_count > 0 && <span>💧 ×{report.pee_count}</span>}
            {report.distance_meters != null && report.distance_meters > 0 && (
              <span>📏 {report.distance_meters >= 1000 ? `${(report.distance_meters / 1000).toFixed(1)}km` : `${Math.round(report.distance_meters)}m`}</span>
            )}
          </div>
          {(report.start_location || report.end_location) && (
            <p className="text-xs text-stone-400 mt-1 truncate">
              {report.start_location && `📍 ${report.start_location}`}
              {report.start_location && report.end_location && ' → '}
              {report.end_location && `🏁 ${report.end_location}`}
            </p>
          )}
          {report.notes && (
            <p className="text-xs text-stone-400 italic mt-1.5 line-clamp-1">&ldquo;{report.notes}&rdquo;</p>
          )}
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 w-full py-3 text-xs font-bold transition-all border-t"
        style={{
          borderColor: 'rgba(226,220,200,0.7)',
          color: copied ? '#15803D' : 'oklch(0.44 0.16 196)',
          background: copied ? '#F0FDF4' : 'transparent',
        }}
      >
        {copied ? '✓ Copied!' : '🔗 Copy shareable link'}
      </button>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WalkReportClient({
  initialReports, providerName, hideHeader = false,
}: Props) {
  const [reports, setReports] = useState<WalkReport[]>(initialReports)

  function handleDelete(id: string) {
    setReports(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="min-h-dvh pb-28" style={{ background: 'oklch(0.975 0.006 85)' }}>

      {!hideHeader && (
        <header className="sticky top-0 z-40 bg-white border-b border-border">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="font-display text-xl text-stone-900">Walk Reports</h1>
            <span className="text-xs text-stone-400 font-medium truncate max-w-[160px]">{providerName}</span>
          </div>
        </header>
      )}

      <main className="max-w-lg mx-auto px-4 py-5">

        {!hideHeader && (
          <a
            href="/pro/reports/live"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-base transition-all mb-6"
            style={{
              background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
              boxShadow: '0 4px 0px oklch(0.35 0.14 196), 0 8px 24px oklch(0.48 0.17 196 / 0.3)',
            }}
          >
            <span className="text-xl">🦮</span>
            Start a Walk — GPS Tracking
            <span className="text-lg opacity-70">→</span>
          </a>
        )}

        {/* Past reports */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">Walk History</h2>
          {reports.length > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              {reports.length}
            </span>
          )}
        </div>

        {reports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={EASE_OUT}
            className="rounded-2xl p-10 text-center"
            style={CLAY_CARD}
          >
            <div className="text-5xl mb-4">🐾</div>
            <h3 className="text-base font-bold text-stone-900 mb-2">No walks yet</h3>
            <p className="text-sm text-stone-400 leading-relaxed">
              Start a walk with GPS tracking — the pet parent gets a shareable care card when you&apos;re done.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {reports.map(report => (
                <ReportCard key={report.id} report={report} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}

      </main>
    </div>
  )
}
