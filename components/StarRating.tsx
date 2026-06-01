'use client'

import { useState } from 'react'

interface DisplayProps {
  rating: number
  count?: number
  size?: 'sm' | 'md' | 'lg'
}

interface InteractiveProps {
  value: number
  onChange: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'text-sm', md: 'text-xl', lg: 'text-2xl' }

// Read-only star display
export function Stars({ rating, count, size = 'sm' }: DisplayProps) {
  const full  = Math.floor(rating)
  const half  = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <span className={`inline-flex items-center gap-1 ${SIZES[size]}`}>
      <span className="leading-none">
        {'★'.repeat(full)}
        {half ? '½' : ''}
        {'☆'.repeat(empty)}
      </span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground font-normal ml-0.5">
          {rating.toFixed(1)} ({count})
        </span>
      )}
    </span>
  )
}

// Interactive star picker for the review form
export function StarPicker({ value, onChange, size = 'lg' }: InteractiveProps) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className={`${SIZES[size]} leading-none transition-transform active:scale-90 ${
            n <= active ? 'text-amber-400' : 'text-stone-300'
          }`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
