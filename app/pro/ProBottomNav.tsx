'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/pro/dashboard', label: 'Home',     icon: '🏠' },
  { href: '/pro/bookings',  label: 'Bookings', icon: '📒' },
  { href: '/pro/fitness',   label: 'Fitness',  icon: '🏃' },
  { href: '/pro/leads',     label: 'Leads',    icon: '📋' },
  { href: '/pro/profile',   label: 'Profile',  icon: '👤' },
]

export default function ProBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-lg mx-auto flex">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex-1 flex flex-col items-center justify-center pt-2.5 pb-2 gap-0.5 transition-colors ${
                active ? 'text-[var(--pl-teal)]' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: 'oklch(0.48 0.17 196)' }}
                />
              )}
              <span className="text-xl leading-none">{icon}</span>
              <span className={`text-[9px] font-semibold tracking-tight ${active ? 'text-[var(--pl-teal)]' : 'text-stone-400'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
