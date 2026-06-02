'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const MUMBAI_AREAS = [
  { name: 'Juhu',           emoji: '🏖' },
  { name: 'Andheri West',   emoji: '🌆' },
  { name: 'Andheri East',   emoji: '🏙' },
  { name: 'Bandra West',    emoji: '☕' },
  { name: 'Bandra East',    emoji: '🚉' },
  { name: 'Versova',        emoji: '🎣' },
  { name: 'Santacruz',      emoji: '✈️' },
  { name: 'Vile Parle',     emoji: '🎓' },
  { name: 'Khar',           emoji: '🌿' },
  { name: 'Lokhandwala',    emoji: '⭐' },
]

export default function LocationPicker() {
  const [area, setArea] = useState('Juhu')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pawlocal_area')
    if (saved) setArea(saved)
  }, [])

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function select(name: string) {
    setArea(name)
    localStorage.setItem('pawlocal_area', name)
    setOpen(false)
    // Update URL so server components re-fetch with the new neighbourhood
    router.push(`${pathname}?area=${encodeURIComponent(name)}`)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger chip */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer"
        style={{
          background: '#FDE68A',
          color: '#78350F',
          boxShadow: open
            ? '0 2px 0px rgba(180,83,9,0.2), 0 4px 12px rgba(253,230,138,0.7)'
            : '0 2px 0px rgba(180,83,9,0.15), 0 4px 12px rgba(253,230,138,0.55)',
          border: 'none',
          outline: 'none',
        }}
      >
        <span>📍</span>
        <span>{area}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="inline-block ml-0.5 opacity-60 text-[10px]"
        >
          ▾
        </motion.span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 z-50 overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #FFFFFF 0%, #FFFDF5 100%)',
              borderRadius: 20,
              boxShadow: '0 6px 0px rgba(180,83,9,0.12), 0 16px 40px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,1)',
              border: '1px solid rgba(253,230,138,0.5)',
            }}
          >
            {/* Header label */}
            <div className="px-4 pt-3 pb-2 border-b border-amber-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Your neighbourhood</p>
            </div>

            {/* Area list */}
            <div className="py-1.5 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {MUMBAI_AREAS.map((a) => {
                const active = a.name === area
                return (
                  <button
                    key={a.name}
                    role="option"
                    aria-selected={active}
                    onClick={() => select(a.name)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors"
                    style={{
                      background: active ? '#FEF3C7' : 'transparent',
                      color: active ? '#78350F' : '#374151',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#FFFBEB' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <span className="text-base w-5 text-center flex-shrink-0">{a.emoji}</span>
                    <span className="flex-1">{a.name}</span>
                    {active && (
                      <span className="text-amber-500 text-xs font-bold flex-shrink-0">✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-amber-50">
              <p className="text-[10px] text-slate-400 text-center">More neighbourhoods coming soon</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
