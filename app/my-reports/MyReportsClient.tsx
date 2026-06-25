'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ParentBottomNav from '@/components/ParentBottomNav'

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface WalkReport {
  id: string
  token: string
  dog_name: string
  walk_date: string
  duration_mins: number | null
  poop_count: number | null
  pee_count: number | null
  distance_meters: number | null
  photo_url: string | null
  notes: string | null
  providers: { name: string } | null
}

interface Props {
  walkReports: WalkReport[]
  groomingReports: unknown[]
  isSubscribed: boolean
  subscriptionPlan: string | null
  userName: string
}

// ─── Framer Motion variants ───────────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

// ─── Date formatting ──────────────────────────────────────────────────────────
function formatWalkDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()

  if (dateStart.getTime() === todayStart.getTime()) {
    return `Today · ${timeStr}`
  } else if (dateStart.getTime() === yesterdayStart.getTime()) {
    return `Yesterday · ${timeStr}`
  } else {
    const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    return `${dayLabel} · ${timeStr}`
  }
}

// ─── Summary line ─────────────────────────────────────────────────────────────
function computeSummary(reports: WalkReport[]): string {
  const totalPoops = reports.reduce((s, r) => s + (r.poop_count ?? 0), 0)
  const totalMeters = reports.reduce((s, r) => s + (r.distance_meters ?? 0), 0)
  const totalKm = (totalMeters / 1000).toFixed(1)

  const parts: string[] = [`${reports.length} walk${reports.length === 1 ? '' : 's'}`]
  if (totalMeters > 0) parts.push(`${totalKm} km total`)
  if (totalPoops > 0) parts.push(`${totalPoops} poop${totalPoops === 1 ? '' : 's'}`)

  return parts.join(' · ')
}

// ─── Walk Card ────────────────────────────────────────────────────────────────
function WalkCard({ report, onClick }: { report: WalkReport; onClick: () => void }) {
  const statParts: string[] = []
  if (report.duration_mins) statParts.push(`⏱ ${report.duration_mins}m`)
  if (report.distance_meters) statParts.push(`📍 ${(report.distance_meters / 1000).toFixed(1)}km`)
  if (report.poop_count) statParts.push(`💩${report.poop_count}`)
  if (report.pee_count) statParts.push(`💧${report.pee_count}`)

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl flex items-center gap-3 active:scale-[0.98]"
      style={{
        background: 'oklch(0.995 0.005 85)',
        boxShadow: '0 2px 10px rgba(10,47,53,0.06)',
        padding: '12px 14px',
        transition: 'transform 0.15s ease-out',
      }}
    >
      {/* Dog avatar */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full text-xl"
        style={{
          width: 40,
          height: 40,
          background: 'oklch(0.48 0.17 196)',
        }}
      >
        🐾
      </div>

      {/* Center content */}
      <div className="flex-1 min-w-0">
        <p
          className="leading-tight truncate"
          style={{ fontFamily: 'var(--font-fredoka)', fontSize: 15, fontWeight: 700, color: '#0A2F35' }}
        >
          {report.dog_name}&apos;s walk
        </p>
        <p
          className="mt-0.5 truncate"
          style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#94a3b8' }}
        >
          {report.providers?.name ? `by ${report.providers.name} · ` : ''}{formatWalkDate(report.walk_date)}
        </p>
        {statParts.length > 0 && (
          <p
            className="mt-1.5 truncate"
            style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 600, color: '#64748b' }}
          >
            {statParts.join(' · ')}
          </p>
        )}
      </div>

      {/* Walk photo (only if present) */}
      {report.photo_url && (
        <img
          src={report.photo_url}
          alt={`${report.dog_name}'s walk`}
          className="flex-shrink-0 rounded-xl object-cover"
          style={{ width: 60, height: 60 }}
        />
      )}
    </button>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center pt-20 pb-10 text-center">
      <span style={{ fontSize: 56, lineHeight: 1 }}>🐾</span>
      <h3
        className="mt-5"
        style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#0A2F35' }}
      >
        No walks yet
      </h3>
      <p
        className="mt-2"
        style={{
          fontFamily: 'var(--font-nunito)',
          fontSize: 13,
          color: '#94a3b8',
          maxWidth: 240,
          lineHeight: 1.5,
        }}
      >
        Your first walk report will appear here after your walker logs a walk.
      </p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MyReportsClient({ walkReports, userName }: Props) {
  const router = useRouter()

  const dogName = walkReports.length > 0 ? walkReports[0].dog_name : null
  const summary = walkReports.length > 0 ? computeSummary(walkReports) : null

  // Sort newest first
  const sorted = [...walkReports].sort(
    (a, b) => new Date(b.walk_date).getTime() - new Date(a.walk_date).getTime()
  )

  return (
    <div className="min-h-dvh">

      {/* Sticky header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: '#FFFBEB', borderBottom: '1px solid rgba(10,47,53,0.06)' }}
      >
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center gap-3">
          <h1
            style={{
              fontFamily: 'var(--font-fredoka)',
              fontSize: 20,
              fontWeight: 700,
              color: '#0A2F35',
              flex: 1,
            }}
          >
            Walk reports
          </h1>
          {dogName && (
            <span
              className="flex-shrink-0 px-3 py-1 rounded-full"
              style={{
                fontFamily: 'var(--font-nunito)',
                fontSize: 12,
                fontWeight: 700,
                background: 'oklch(0.48 0.17 196 / 0.1)',
                color: 'oklch(0.48 0.17 196)',
              }}
            >
              {dogName}
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[480px] mx-auto px-4 pb-28 pt-4">

        {/* Summary line */}
        {summary && (
          <p
            className="mb-4"
            style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94a3b8' }}
          >
            {summary}
          </p>
        )}

        {/* Walk cards or empty state */}
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col"
            style={{ gap: 8 }}
          >
            {sorted.map((report) => (
              <motion.div key={report.id} variants={item}>
                <WalkCard
                  report={report}
                  onClick={() => router.push(`/walk-report/${report.token}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      <ParentBottomNav />
    </div>
  )
}
