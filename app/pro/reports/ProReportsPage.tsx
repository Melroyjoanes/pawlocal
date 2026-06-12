'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import WalkReportClient from './WalkReportClient'
import GroomingReportClient from '../grooming/GroomingReportClient'

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

type Props = {
  walkReports: WalkReport[]
  groomingReports: GroomingReport[]
  providerId: string
  providerName: string
  verificationTier: string | null
  isGroomer: boolean
  isWalker: boolean
}

type Tab = 'walks' | 'grooming'

const SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const

const CLAY_CARD: React.CSSProperties = {
  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
  border: '1px solid rgba(226,220,200,0.7)',
}

export default function ProReportsPage({
  walkReports, groomingReports, providerId, providerName, verificationTier, isGroomer, isWalker,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('walks')
  const dirRef = useRef(0)

  function switchTab(tab: Tab) {
    if (tab === activeTab) return
    dirRef.current = tab === 'grooming' ? 1 : -1
    setActiveTab(tab)
  }

  const showBothCtAs = isWalker && isGroomer

  return (
    <div className="min-h-dvh" style={{ background: 'oklch(0.975 0.006 85)' }}>

      {/* ── Hero CTA zone — not sticky ── */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-2">
        <div className="mb-5">
          <h1 className="font-display text-2xl text-stone-900 leading-tight">Care Cards</h1>
          <p className="text-xs text-stone-400 mt-0.5 font-medium">{providerName}</p>
        </div>

        <div className={`grid gap-3 ${showBothCtAs ? 'grid-cols-2' : 'grid-cols-1'}`}>
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

      {/* ── Sticky tab bar (only shown if provider is a groomer — to switch history view) ── */}
      {isGroomer && (
        <div className="sticky top-0 z-40 bg-white border-b border-border mt-4">
          <div className="max-w-lg mx-auto px-4 h-12 flex items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 flex-shrink-0">History</p>
            <div className="flex-1 relative flex p-1 rounded-2xl"
              style={{
                background: 'oklch(0.975 0.006 85)',
                border: '1px solid rgba(226,220,200,0.6)',
              }}>

              {/* Sliding pill */}
              <motion.div
                className="absolute inset-y-1 rounded-xl bg-white pointer-events-none"
                style={{
                  left: 4,
                  width: 'calc(50% - 6px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(15,45,50,0.1)',
                }}
                animate={{ x: activeTab === 'grooming' ? 'calc(100% + 4px)' : '0%' }}
                transition={SPRING}
              />

              <button
                type="button"
                onClick={() => switchTab('walks')}
                className="flex-1 relative z-10 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors rounded-xl"
                style={{ color: activeTab === 'walks' ? '#1C1917' : '#A8A29E' }}
                aria-selected={activeTab === 'walks'}
              >
                🐾 Walks
              </button>

              <button
                type="button"
                onClick={() => switchTab('grooming')}
                className="flex-1 relative z-10 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors rounded-xl"
                style={{ color: activeTab === 'grooming' ? '#1C1917' : '#A8A29E' }}
                aria-selected={activeTab === 'grooming'}
              >
                ✂️ Grooming
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-only section label when not a groomer */}
      {!isGroomer && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Walk History</p>
        </div>
      )}

      {/* ── Content — direction-aware slide ── */}
      <AnimatePresence mode="wait" custom={dirRef.current}>
        <motion.div
          key={activeTab}
          custom={dirRef.current}
          variants={{
            enter: (d: number) => ({ x: d * 22, opacity: 0, filter: 'blur(3px)' }),
            center: { x: 0, opacity: 1, filter: 'blur(0px)' },
            exit: (d: number) => ({ x: d * -14, opacity: 0, filter: 'blur(0px)' }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
        >
          {activeTab === 'walks' || !isGroomer ? (
            <WalkReportClient
              initialReports={walkReports}
              providerId={providerId}
              providerName={providerName}
              verificationTier={verificationTier}
              hideHeader
            />
          ) : (
            <GroomingReportClient
              initialReports={groomingReports}
              providerId={providerId}
              providerName={providerName}
              hideHeader
            />
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  )
}
