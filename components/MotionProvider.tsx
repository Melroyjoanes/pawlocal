'use client'

import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion'

// LazyMotion + domAnimation loads ~30% less JS than the full Framer bundle.
// domAnimation covers all standard animations, transitions, and AnimatePresence.
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
