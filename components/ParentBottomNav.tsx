'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/home',       label: 'Home',    icon: '🏠' },
  { href: '/my-account', label: 'Account', icon: '🐕' },
  { href: '/upgrade',    label: 'Upgrade', icon: '⭐' },
]

export default function ParentBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t"
      style={{
        borderColor: 'oklch(0.906 0.06 88)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="max-w-lg mx-auto flex">
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
                  className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-xl"
                  style={{ backgroundColor: 'oklch(0.48 0.17 196 / 0.1)' }}
                />
              )}
              <span
                className="relative text-xl leading-none"
                style={{ filter: active ? 'none' : 'grayscale(40%)' }}
              >
                {icon}
              </span>
              <span
                className="relative text-[9px] font-bold tracking-tight"
                style={{ color: active ? 'oklch(0.48 0.17 196)' : 'oklch(0.55 0.01 250)' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
