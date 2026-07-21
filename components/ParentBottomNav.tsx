'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const NAV = [
  { href: '/home',       label: 'Home',    icon: '🏠' },
  { href: '/my-reports', label: 'Reports', icon: '📋' },
  // Always visible regardless of whether a dog/walker is set up yet —
  // /walk/self itself redirects to dog setup first if none exists, so this
  // one link correctly covers all three parent states: no dog, dog only,
  // dog + walker connected.
  { href: '/walk/self',  label: 'Log Walk', icon: '🐾' },
  { href: '/my-account', label: 'Account', icon: '👤' },
]

function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Floating glass-nav shadow — soft elevation, cream-tinted highlight on the
// glass edge, teal-dark ambient shadow to read as "hovering" above content.
const FLOAT_NAV_SHADOW = [
  'inset 0 1px 0 rgba(255,255,255,0.55)',
  'inset 0 -1px 0 rgba(10,47,53,0.05)',
  '0 8px 24px -6px rgba(10,47,53,0.16)',
  '0 24px 48px -16px rgba(10,47,53,0.18)',
].join(', ')

export default function ParentBottomNav() {
  const pathname = usePathname()
  const rm = useReducedMotion()

  return (
    <nav
      className="fixed left-0 right-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div
        className="max-w-lg w-full flex"
        style={{
          borderRadius: 28,
          background: 'oklch(0.995 0.005 85 / 0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid oklch(0.906 0.06 88 / 0.55)',
          boxShadow: FLOAT_NAV_SHADOW,
        }}
      >
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="relative flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors min-h-[56px]"
            >
              {active && (
                <span
                  className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-2xl"
                  style={{ backgroundColor: 'oklch(0.48 0.17 196 / 0.1)' }}
                />
              )}
              <motion.div
                className="relative flex flex-col items-center gap-1"
                whileTap={rm ? undefined : { scale: 0.9 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              >
                <span
                  className="text-xl leading-none"
                  style={{ filter: active ? 'none' : 'grayscale(40%)' }}
                >
                  {icon}
                </span>
                <span
                  className="text-[9px] font-bold tracking-tight"
                  style={{ color: active ? 'oklch(0.48 0.17 196)' : 'oklch(0.55 0.01 250)' }}
                >
                  {label}
                </span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
