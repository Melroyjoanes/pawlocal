'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SearchBar from './SearchBar'

export default function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close overlay on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
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
      {/* Desktop: inline search bar, always visible */}
      <div className="hidden md:block w-56 lg:w-72">
        <SearchBar />
      </div>

      {/* Mobile: icon button that opens overlay */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open search"
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-base hover:bg-amber-50 transition-colors"
      >
        🔍
      </button>

      {/* Mobile search overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div
            ref={overlayRef}
            className="bg-white border-b border-border px-4 py-3 flex items-center gap-2"
            style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
          >
            <SearchBar className="flex-1" autoFocus />
            <button
              onClick={() => setOpen(false)}
              className="ml-1 text-sm text-muted-foreground font-medium px-2 py-1.5 rounded-lg hover:bg-stone-100 transition-colors flex-shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
