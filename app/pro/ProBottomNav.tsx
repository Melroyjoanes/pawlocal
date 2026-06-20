'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { t, type Lang } from '@/lib/pro-translations'

export default function ProBottomNav() {
  const pathname = usePathname()
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem('pro_lang') as Lang | null
    if (stored === 'hi' || stored === 'mr') setLang(stored)
    function onStorage(e: StorageEvent) {
      if (e.key === 'pro_lang' && (e.newValue === 'en' || e.newValue === 'hi' || e.newValue === 'mr')) {
        setLang(e.newValue as Lang)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const NAV = [
    { href: '/pro/reports', label: t(lang, 'nav_care_cards'), icon: '🐾' },
    { href: '/pro/clients', label: t(lang, 'nav_clients'),    icon: '👥' },
    { href: '/pro/leads',   label: t(lang, 'nav_leads'),      icon: '📣' },
    { href: '/pro/profile', label: t(lang, 'nav_profile'),    icon: '👤' },
  ]

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
              className="relative flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors min-h-[56px]"
            >
              {/* Active pill background */}
              {active && (
                <span
                  className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-xl"
                  style={{ backgroundColor: 'oklch(0.48 0.17 196 / 0.1)' }}
                />
              )}
              <span className="relative text-xl leading-none" style={{ filter: active ? 'none' : 'grayscale(40%)' }}>
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
