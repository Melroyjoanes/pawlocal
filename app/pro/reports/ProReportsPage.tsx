'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

type WalkReport = {
  id: string; token: string; dog_name: string; duration_mins: number
  poop_count: number; pee_count: number; notes: string | null
  photo_url: string | null; walk_date: string; created_at: string
  start_location: string | null; end_location: string | null
}

type GroomingReport = {
  id: string; token: string; dog_name: string; grooming_date: string
  duration_mins: number; services_done: string[]; ticks_found: number
  tick_locations: string[]; skin_condition: string; ear_condition: string
  nail_condition: string; coat_condition: string; behavior: string
  before_photo_url: string | null; after_photo_url: string | null
  notes: string | null; recommendations: string | null; created_at: string
}

type CareCardItem =
  | (WalkReport & { kind: 'walk' })
  | (GroomingReport & { kind: 'grooming' })

type Filter = 'all' | 'walks' | 'grooming'

type Props = {
  walkReports: WalkReport[]
  groomingReports: GroomingReport[]
  providerId: string
  providerName: string
  verificationTier: string | null
  isGroomer: boolean
  isWalker: boolean
}

const SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const

const CLAY_CARD: React.CSSProperties = {
  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
  border: '1px solid rgba(226,220,200,0.7)',
}

function formatDate(dateStr: string) {
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return dateStr }
}

function CareCardRow({ card, onDelete }: { card: CareCardItem; onDelete: (id: string, kind: 'walk' | 'grooming') => void }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const waUrl = card.kind === 'walk'
    ? `https://wa.me/?text=${encodeURIComponent(`Here is ${card.dog_name}'s walk report! 🐾\n${origin}/walk-report/${card.token}`)}`
    : `https://wa.me/?text=${encodeURIComponent(`Here is ${card.dog_name}'s grooming report! ✂️\n${origin}/grooming-report/${card.token}`)}`

  const dateLabel = card.kind === 'walk'
    ? formatDate(card.walk_date)
    : formatDate((card as GroomingReport).grooming_date)

  return (
    <div className="rounded-2xl p-4 relative" style={CLAY_CARD}>
      {/* Type badge + delete */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 font-bold leading-none"
          style={{
            fontSize: 9,
            background: card.kind === 'walk' ? 'oklch(0.92 0.08 196)' : 'oklch(0.93 0.07 75)',
            color: card.kind === 'walk' ? 'oklch(0.38 0.13 196)' : 'oklch(0.45 0.12 65)',
          }}
        >
          {card.kind === 'walk' ? '🦮 Walk' : '✂️ Grooming'}
        </span>
        <button
          type="button"
          onClick={() => onDelete(card.id, card.kind)}
          className="text-stone-300 hover:text-stone-500 transition-colors font-bold leading-none"
          style={{ fontSize: 13 }}
          aria-label="Delete"
        >
          ✕
        </button>
      </div>

      {/* Dog name + date */}
      <div className="pr-20 mb-2">
        <p className="font-bold text-stone-900 text-sm leading-tight">{card.dog_name}</p>
        <p className="text-xs text-stone-400 mt-0.5">{dateLabel}</p>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
        {card.kind === 'walk' ? (
          <>
            <span className="text-xs text-stone-600">⏱ {card.duration_mins} min</span>
            {card.poop_count > 0 && <span className="text-xs text-stone-600">💩 {card.poop_count}</span>}
            {card.pee_count > 0 && <span className="text-xs text-stone-600">💧 {card.pee_count}</span>}
            {/* distance is not in WalkReport type so skip */}
          </>
        ) : (
          <>
            <span className="text-xs text-stone-600">⏱ {(card as GroomingReport).duration_mins} min</span>
            {(() => {
              const services = (card as GroomingReport).services_done ?? []
              const label = services.length > 2
                ? `${services.slice(0, 2).join(', ')} +${services.length - 2} more`
                : services.join(', ')
              return label ? <span className="text-xs text-stone-600">✂️ {label}</span> : null
            })()}
            {(card as GroomingReport).ticks_found > 0 && (
              <span className="text-xs text-stone-600">🔍 {(card as GroomingReport).ticks_found} tick{(card as GroomingReport).ticks_found !== 1 ? 's' : ''}</span>
            )}
          </>
        )}
      </div>

      {/* WhatsApp share */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-white font-bold text-xs transition-opacity active:opacity-80"
        style={{ background: '#25D366' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Share on WhatsApp
      </a>
    </div>
  )
}

export default function ProReportsPage({
  walkReports: initialWalkReports,
  groomingReports: initialGroomingReports,
  providerId,
  providerName,
  verificationTier,
  isGroomer,
  isWalker,
}: Props) {
  const [walkList, setWalkList] = useState(initialWalkReports)
  const [groomingList, setGroomingList] = useState(initialGroomingReports)
  const [filter, setFilter] = useState<Filter>('all')

  const showBothCTAs = isWalker && isGroomer
  const showFilterPills = isWalker && isGroomer

  // Streak counter
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const streakCount = [...walkList, ...groomingList].filter(r => new Date(r.created_at) >= sevenDaysAgo).length

  // Unified feed
  const allCards: CareCardItem[] = [
    ...walkList.map(r => ({ ...r, kind: 'walk' as const })),
    ...groomingList.map(r => ({ ...r, kind: 'grooming' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const visibleCards = filter === 'walks' ? allCards.filter(c => c.kind === 'walk')
    : filter === 'grooming' ? allCards.filter(c => c.kind === 'grooming')
    : allCards

  function handleDelete(id: string, kind: 'walk' | 'grooming') {
    if (kind === 'walk') {
      const token = walkList.find(r => r.id === id)?.token
      setWalkList(p => p.filter(r => r.id !== id))
      if (token) fetch(`/api/walk-reports/${token}`, { method: 'DELETE' }).catch(() => {})
    } else {
      const token = groomingList.find(r => r.id === id)?.token
      setGroomingList(p => p.filter(r => r.id !== id))
      if (token) fetch(`/api/grooming-reports/${token}`, { method: 'DELETE' }).catch(() => {})
    }
  }

  const FILTER_PILLS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'walks', label: '🦮 Walks' },
    { value: 'grooming', label: '✂️ Grooming' },
  ]

  return (
    <div className="min-h-dvh pb-28" style={{ background: 'oklch(0.975 0.006 85)' }}>

      {/* ── Hero CTA zone ── */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-2">
        <div className="mb-5 flex items-center gap-3">
          <div>
            <h1 className="font-display text-2xl text-stone-900 leading-tight">Care Cards</h1>
            <p className="text-xs text-stone-400 mt-0.5 font-medium">{providerName}</p>
          </div>
          {streakCount > 0 && (
            <span
              className="ml-auto flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
              style={{
                background: 'oklch(0.90 0.10 196)',
                color: 'oklch(0.36 0.14 196)',
              }}
            >
              🔥 {streakCount} this week
            </span>
          )}
        </div>

        <div className={`grid gap-3 ${showBothCTAs ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {isWalker && (
            <Link
              href="/pro/reports/live"
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.2), 0 6px 20px rgba(15,90,80,0.2)',
              }}
            >
              <span className="text-2xl">🦮</span>
              <span>Start Walk</span>
            </Link>
          )}

          {isGroomer && (
            <Link
              href="/pro/grooming"
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-bold text-base transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(160deg, oklch(0.72 0.14 75) 0%, oklch(0.64 0.15 65) 100%)',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.25), 0 6px 20px rgba(180,100,20,0.18)',
                color: '#fff',
              }}
            >
              <span className="text-2xl">✂️</span>
              <span>Start Grooming</span>
            </Link>
          )}

          {/* Fallback if neither flag set — show both */}
          {!isWalker && !isGroomer && (
            <>
              <Link
                href="/pro/reports/live"
                className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
                  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.2), 0 6px 20px rgba(15,90,80,0.2)',
                }}
              >
                <span className="text-2xl">🦮</span>
                <span>Start Walk</span>
              </Link>
              <Link
                href="/pro/grooming"
                className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-bold text-base transition-all active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(160deg, oklch(0.72 0.14 75) 0%, oklch(0.64 0.15 65) 100%)',
                  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.25), 0 6px 20px rgba(180,100,20,0.18)',
                  color: '#fff',
                }}
              >
                <span className="text-2xl">✂️</span>
                <span>Start Grooming</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Feed section ── */}
      <div className="max-w-lg mx-auto px-4 mt-6">

        {/* Section label + filter pills */}
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 flex-shrink-0">History</p>

          {showFilterPills && (
            <div
              className="flex p-1 rounded-2xl gap-0.5 relative"
              style={{
                background: 'oklch(0.975 0.006 85)',
                border: '1px solid rgba(226,220,200,0.6)',
              }}
            >
              {FILTER_PILLS.map((pill, i) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setFilter(pill.value)}
                  className="relative z-10 px-3 py-1 rounded-xl text-xs font-bold transition-colors"
                  style={{ color: filter === pill.value ? '#1C1917' : '#A8A29E' }}
                >
                  {filter === pill.value && (
                    <motion.div
                      layoutId="filter-pill"
                      className="absolute inset-0 rounded-xl bg-white"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(15,45,50,0.1)' }}
                      transition={SPRING}
                    />
                  )}
                  <span className="relative z-10">{pill.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feed */}
        {visibleCards.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={CLAY_CARD}>
            <div className="text-5xl mb-4">{isWalker ? '🐾' : '✂️'}</div>
            <h3 className="text-base font-bold text-stone-900 mb-2">No care cards yet</h3>
            <p className="text-sm text-stone-400 leading-relaxed">
              Start {isWalker ? 'a walk' : 'a grooming session'} above — the pet parent gets a beautiful care card to keep.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="flex flex-col gap-3">
              {visibleCards.map(card => (
                <motion.div
                  key={`${card.kind}-${card.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={SPRING}
                >
                  <CareCardRow card={card} onDelete={handleDelete} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

    </div>
  )
}
