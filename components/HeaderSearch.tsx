'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SearchBar from './SearchBar'

const EASE_OUT_QUART = [0.25, 0.46, 0.45, 0.94] as const

export default function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <>
      {/* Desktop: inline search bar, fixed width */}
      <div className="hidden md:block md:w-52 lg:w-64 flex-shrink-0">
        <SearchBar />
      </div>

      {/* Mobile: tappable search pill — fills available space */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Search providers"
        className="md:hidden flex-1 flex items-center gap-2 h-9 px-3 rounded-2xl text-sm font-medium text-stone-400 min-w-0 active:scale-[0.98] transition-transform touch-manipulation"
        style={{
          background: 'oklch(0.970 0.016 88)',
          border: '1px solid oklch(0.906 0.026 88)',
          boxShadow: 'inset 0 1.5px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <svg
          width="13" height="13" viewBox="0 0 20 20"
          fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0 opacity-50"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6.5" />
          <path d="m15.5 15.5 2.5 2.5" />
        </svg>
        <span className="truncate">Walkers, vets, groomers…</span>
      </button>

      {/* Mobile overlay — slides in from top, backdrop fades */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden fixed inset-0 z-50 flex flex-col"
            style={{ background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          >
            <motion.div
              ref={overlayRef}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE_OUT_QUART }}
              className="flex items-center gap-2 px-4"
              style={{
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                paddingBottom: '12px',
                background: 'oklch(0.988 0.018 88)',
                borderBottom: '1px solid oklch(0.92 0.022 88)',
                boxShadow: '0 4px 24px rgba(15,45,50,0.10)',
              }}
            >
              <SearchBar className="flex-1" autoFocus />
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-stone-500 font-semibold px-2.5 py-1.5 rounded-xl hover:bg-amber-50 transition-colors flex-shrink-0"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
