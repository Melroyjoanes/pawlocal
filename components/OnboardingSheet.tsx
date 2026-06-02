'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const AREAS = [
  'Juhu', 'Andheri West', 'Andheri East', 'Versova', 'Lokhandwala',
  'Bandra', 'Khar', 'Santacruz', 'Vile Parle', 'JVLR',
]

const STORAGE_KEY = 'pawlocal_area'

export default function OnboardingSheet() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Only show if not already set
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      // Small delay so page loads first
      const t = setTimeout(() => setOpen(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  function pick(area: string) {
    setSelected(area)
  }

  function confirm() {
    if (!selected) return
    localStorage.setItem(STORAGE_KEY, selected)
    setDone(true)
    setTimeout(() => setOpen(false), 400)
  }

  function skip() {
    localStorage.setItem(STORAGE_KEY, 'Juhu') // default
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={skip}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => { if (info.offset.y > 80) skip() }}
            className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-stone-200" />
            </div>

            <div className="px-5 pb-6">
              {/* Header */}
              <div className="mb-5 mt-2">
                <div className="text-2xl mb-2">📍</div>
                <h2 className="text-xl font-bold text-foreground">Where are you in Mumbai?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We&apos;ll show you the closest pet services
                </p>
              </div>

              {/* Area grid */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                {AREAS.map((area) => (
                  <button
                    key={area}
                    onClick={() => pick(area)}
                    className={`px-4 py-3 rounded-2xl text-sm font-medium text-left border transition-all ${
                      selected === area
                        ? 'bg-[var(--pl-teal)] text-white border-transparent shadow-md'
                        : 'bg-stone-50 text-foreground border-border hover:border-[var(--pl-teal)]'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <button
                onClick={confirm}
                disabled={!selected}
                className="w-full py-3.5 rounded-2xl text-sm font-bold bg-[var(--pl-teal)] text-white disabled:opacity-40 transition-all active:scale-95"
              >
                {done ? '✓ Set!' : 'Set my area'}
              </button>
              <button
                onClick={skip}
                className="w-full py-2.5 text-sm text-muted-foreground mt-2 hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
