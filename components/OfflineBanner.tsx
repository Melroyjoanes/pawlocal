'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Slim top banner for connectivity changes — the pattern most SaaS apps
// (Slack, Linear, Notion) use instead of letting requests silently fail.
// Shows "back online" briefly so the state change is confirmed, not just
// implied by the banner disappearing.
export default function OfflineBanner() {
  const [status, setStatus] = useState<'online' | 'offline' | 'reconnected' | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!navigator.onLine) setStatus('offline')

    function handleOffline() {
      setStatus('offline')
    }
    function handleOnline() {
      setStatus('reconnected')
      window.setTimeout(() => setStatus(null), 2200)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return (
    <AnimatePresence>
      {status && (
        <motion.div
          initial={reduceMotion ? undefined : { y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? undefined : { y: -40, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] flex justify-center px-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div
            className="mt-2 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"
            style={{
              fontFamily: 'var(--font-nunito)',
              background: status === 'offline' ? '#451A03' : '#0A2F35',
              color: status === 'offline' ? '#FED7AA' : '#A7F3D0',
              boxShadow: '0 8px 24px -6px rgba(10,47,53,0.35)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: status === 'offline' ? '#FB923C' : '#34D399' }}
            />
            {status === 'offline'
              ? "You're offline — some things may not load"
              : 'Back online'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
