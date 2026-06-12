'use client'

import { useState, useRef } from 'react'
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
}

type Tab = 'walks' | 'grooming'

const SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const

export default function ProReportsPage({
  walkReports, groomingReports, providerId, providerName, verificationTier, isGroomer,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('walks')
  const dirRef = useRef(0)

  function switchTab(tab: Tab) {
    if (tab === activeTab) return
    dirRef.current = tab === 'grooming' ? 1 : -1
    setActiveTab(tab)
  }

  return (
    <div className="min-h-dvh" style={{ background: 'oklch(0.975 0.006 85)' }}>

      {/* ── Unified header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">

          {/* Segmented pill tabs */}
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
                width: isGroomer ? 'calc(50% - 6px)' : 'calc(100% - 8px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(15,45,50,0.1)',
              }}
              animate={{ x: isGroomer && activeTab === 'grooming' ? 'calc(100% + 4px)' : '0%' }}
              transition={SPRING}
            />

            <button
              type="button"
              onClick={() => switchTab('walks')}
              className="flex-1 relative z-10 py-2 flex items-center justify-center gap-1.5 text-sm font-bold transition-colors rounded-xl"
              style={{ color: activeTab === 'walks' ? '#1C1917' : '#A8A29E' }}
              aria-selected={activeTab === 'walks'}
            >
              <span>🐾</span> Walks
            </button>

            {isGroomer && (
              <button
                type="button"
                onClick={() => switchTab('grooming')}
                className="flex-1 relative z-10 py-2 flex items-center justify-center gap-1.5 text-sm font-bold transition-colors rounded-xl"
                style={{ color: activeTab === 'grooming' ? '#1C1917' : '#A8A29E' }}
                aria-selected={activeTab === 'grooming'}
              >
                <span>✂️</span> Grooming
              </button>
            )}
          </div>

          <span className="text-xs text-stone-400 font-medium truncate max-w-[100px] flex-shrink-0">
            {providerName}
          </span>
        </div>
      </header>

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
