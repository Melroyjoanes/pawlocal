'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ParentBottomNav from '@/components/ParentBottomNav'
import { CLAY_SHADOW_CREAM, CLAY_SHADOW_ORANGE, CLAY_SHADOW_ORANGE_SM, CLAY_SHADOW_TEAL } from '@/lib/clayShadows'

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
  logged_by?: 'walker' | 'parent'
}

interface Props {
  walkReports: WalkReport[]
  isSubscribed: boolean
  subscriptionPlan: string | null
  userName: string
  trialExpired: boolean
  // The single source of truth for "can this user see walker reports right
  // now" (isPro || trialActive). Gating on trialExpired alone missed a lapsed
  // subscriber who never trialed (trial_started_at null → trialExpired false),
  // leaking their whole walker history here while home + the per-report page
  // correctly locked it.
  isEntitled: boolean
  totalReports: number
  hasDog: boolean
  hasActiveWalker: boolean
  primaryDogName: string | null
  walkerName: string | null
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
    <div className="flex flex-col items-center justify-center pt-8 pb-8 text-center">
      <div
        className="flex flex-col items-center"
        style={{
          background: 'oklch(0.995 0.005 85)',
          borderRadius: 28,
          boxShadow: CLAY_SHADOW_CREAM,
          padding: '40px 28px',
          width: '100%',
        }}
      >
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
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MyReportsClient({ walkReports, userName, isSubscribed, isEntitled, totalReports, trialExpired, hasDog, hasActiveWalker, primaryDogName, walkerName }: Props) {
  const router = useRouter()
  const [showUnlock, setShowUnlock] = useState(() => {
    if (typeof window === 'undefined') return false
    return isSubscribed && !localStorage.getItem('pupstep_pro_welcome_seen')
  })

  // Self-walk reports are always free to view (see the isSelfWalk carve-out
  // in app/walk-report/[token]/page.tsx) — a self-walk-only user must never
  // hit the paywall here, and a mixed user still gets to see their free
  // self-walk reports even while their walker-logged ones are locked.
  const hasSelfWalkReports = walkReports.some((r) => r.logged_by === 'parent')

  // This screen used to have two states keyed off `totalReports` alone, so a
  // parent who had just signed up — no dog, no walker, no trial — was told
  // "Your trial has ended. Your walker can still log walks." Both false:
  // trialExpired is only true once trial_started_at is set and elapsed (see
  // lib/entitlement.ts), and the trial starts on the FIRST walk report. So
  // zero reports means the trial never began.
  //
  // Four real states, and only the last one is a paywall. Showing ₹199/month
  // to someone who hasn't added a dog asks for money before the product has
  // done anything.
  // Reports-or-expired wins the precedence: a parent who has locked history
  // (or a genuinely spent trial) needs the unlock, even if they since deleted
  // the dog row — telling them to "add your dog" would strand their history.
  // Only below that do the setup states apply.
  const lockedState: 'no-dog' | 'no-walker' | 'awaiting-first-walk' | 'expired' =
    (totalReports > 0 || trialExpired) ? 'expired'
    : !hasDog ? 'no-dog'
    : !hasActiveWalker ? 'no-walker'
    : 'awaiting-first-walk'

  const dog = primaryDogName ?? 'your dog'
  const walker = walkerName ?? 'your walker'

  const LOCKED_COPY = {
    'no-dog': {
      icon: '🐕',
      title: 'No walks here yet',
      body: 'Add your dog, then share a link with whoever walks them. Every walk they log shows up here and on your WhatsApp.',
      cta: 'Add your dog',
      href: '/setup',
    },
    'no-walker': {
      icon: '🔗',
      title: `${dog} is all set`,
      body: `Now share the walker link with whoever walks ${dog}. They just open it — nothing to download, and they never pay.`,
      cta: 'Get the walker link',
      href: '/setup',
    },
    'awaiting-first-walk': {
      icon: '🐾',
      title: 'Waiting on the first walk',
      body: `${walker} is connected. As soon as they finish a walk with ${dog}, the report lands here — and your 3 free days start from that first walk, not before.`,
      cta: 'Back to home',
      href: '/home',
    },
    expired: {
      icon: '🔒',
      title: totalReports > 0
        ? `${totalReports} walk ${totalReports === 1 ? 'report' : 'reports'} on record`
        : 'Your free trial has ended',
      body: totalReports > 0
        ? `${walker} keeps logging walks. Upgrade to get new reports on WhatsApp and open your full history again.`
        : `${walker} can keep logging walks. Upgrade to start getting reports on WhatsApp after every walk.`,
      cta: 'Get reports delivered → ₹199/month',
      href: '/upgrade',
    },
  }[lockedState]

  if (!isEntitled && !hasSelfWalkReports) {
    return (
      <div style={{ minHeight: '100dvh', background: '#FFFBEB', display: 'flex', flexDirection: 'column' }}>
        {/* header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,251,235,0.95)',
          borderBottom: '1px solid oklch(0.906 0.06 88)', backdropFilter: 'blur(8px)',
          padding: '0 16px', height: 56, display: 'flex', alignItems: 'center'
        }}>
          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#0A2F35', margin: 0 }}>
            Walk Reports
          </p>
        </header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 40px', textAlign: 'center', gap: 20 }}>
          <div
            style={{
              background: 'oklch(0.995 0.005 85)',
              borderRadius: 28,
              boxShadow: CLAY_SHADOW_CREAM,
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: 340,
            }}
          >
            <div style={{ fontSize: 56 }}>{LOCKED_COPY.icon}</div>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 24, fontWeight: 700, color: '#0A2F35', margin: '12px 0 8px' }}>
              {LOCKED_COPY.title}
            </p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6, maxWidth: 280 }}>
              {LOCKED_COPY.body}
            </p>
          </div>
          <a
            href={LOCKED_COPY.href}
            className="clay-cta-pill"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: '#FF8C52', color: '#fff', borderRadius: 100,
              padding: '14px 32px', fontSize: 15, fontWeight: 700,
              fontFamily: 'var(--font-nunito)', textDecoration: 'none',
              boxShadow: CLAY_SHADOW_ORANGE,
            }}
          >
            {LOCKED_COPY.cta}
          </a>
          {/* The awaiting-first-walk CTA already goes home; a second link to
              the same place would just be noise. */}
          {LOCKED_COPY.href !== '/home' && (
          <a href="/home" style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>
            ← Back to home
          </a>
          )}
        </div>

        <ParentBottomNav />
        <style>{`
          .clay-cta-pill { transition: transform 120ms ease; }
          .clay-cta-pill:active { transform: scale(0.97); }
          .clay-cta-pill:focus-visible { outline: 3px solid #0A2F35; outline-offset: 3px; }
        `}</style>
      </div>
    )
  }

  // Non-entitled users (trial expired OR lapsed subscription) only get to see
  // self-walk reports (always free) — walker-logged reports stay locked out of
  // the list too, not just out of the full-page gate above.
  const viewableReports = !isEntitled
    ? walkReports.filter((r) => r.logged_by === 'parent')
    : walkReports

  const dogName = viewableReports.length > 0 ? viewableReports[0].dog_name : null
  const summary = viewableReports.length > 0 ? computeSummary(viewableReports) : null

  // Sort newest first
  const sorted = [...viewableReports].sort(
    (a, b) => new Date(b.walk_date).getTime() - new Date(a.walk_date).getTime()
  )

  return (
    <div className="min-h-dvh" style={{ background: '#FFFBEB' }}>

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
            {isSubscribed && (
              <span style={{ background: '#FF8C52', color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-nunito)', borderRadius: 100, padding: '3px 8px', marginLeft: 8, verticalAlign: 'middle', letterSpacing: '0.05em', boxShadow: CLAY_SHADOW_ORANGE_SM }}>PRO</span>
            )}
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

        {/* Pro subtitle */}
        {isSubscribed && (
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: 'oklch(0.48 0.17 196)', fontWeight: 600, margin: '0 0 12px' }}>
            Full history unlocked · Never deleted
          </p>
        )}

        {/* Pro unlock celebration banner */}
        {showUnlock && (
          <div style={{ margin: '0 0 16px', borderRadius: 20, background: 'linear-gradient(135deg, oklch(0.48 0.17 196) 0%, oklch(0.38 0.15 196) 100%)', boxShadow: CLAY_SHADOW_TEAL, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>
                Welcome to PupStep Pro!
              </p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                All reports unlocked. New reports delivered after every walk.
              </p>
            </div>
            <button
              onClick={() => { setShowUnlock(false); localStorage.setItem('pupstep_pro_welcome_seen', '1') }}
              className="clay-close-btn"
              style={{
                background: 'rgba(255,255,255,0.15)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.15)',
                border: 'none', borderRadius: '50%', width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', fontSize: 14, flexShrink: 0,
                transition: 'transform 120ms ease',
              }}
            >×</button>
          </div>
        )}

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
      <style>{`
        .clay-close-btn:active { transform: scale(0.9); }
        .clay-close-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
      `}</style>
    </div>
  )
}
