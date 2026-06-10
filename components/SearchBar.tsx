'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  className?: string
  defaultValue?: string
  autoFocus?: boolean
}

export default function SearchBar({ className = '', defaultValue = '', autoFocus = false }: Props) {
  const [value, setValue] = useState(defaultValue)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  function handleClear() {
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center ${className}`}>
      {/* Search icon — SVG, not emoji */}
      <svg
        width="14" height="14" viewBox="0 0 20 20"
        fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
        className="absolute left-3 text-muted-foreground pointer-events-none opacity-60"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="6.5" />
        <path d="m15.5 15.5 2.5 2.5" />
      </svg>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search vets, groomers, walkers…"
        autoFocus={autoFocus}
        className="w-full pl-8 pr-8 py-2.5 rounded-xl border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 text-muted-foreground hover:text-foreground text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
        >
          ✕
        </button>
      )}
    </form>
  )
}
