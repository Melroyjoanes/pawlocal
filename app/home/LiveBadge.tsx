'use client'

import { motion } from 'framer-motion'

// Isolated so the continuous "breathing" loop only re-renders this tiny
// component, never the rest of the dashboard tree.
function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function LiveBadge() {
  const rm = useReducedMotion()
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full bg-[#25D366]"
          animate={rm ? { opacity: 0.75 } : { opacity: [0.75, 0.15, 0.75], scale: [1, 1.7, 1] }}
          transition={rm ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25D366]" />
      </span>
      <span className="text-xs font-bold tracking-widest text-[#25D366]">LIVE</span>
    </div>
  )
}
