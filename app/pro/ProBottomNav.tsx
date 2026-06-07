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
    // Listen for storage changes in case another tab updates it
    function onStorage(e: StorageEvent) {
      if (e.key === 'pro_lang' && (e.newValue === 'en' || e.newValue === 'hi' || e.newValue === 'mr')) {
        setLang(e.newValue as Lang)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const NAV = [
    { href: '/pro/dashboard', label: t(lang, 'nav_dashboard'), icon: '🏠' },
    { href: '/pro/bookings',  label: t(lang, 'nav_bookings'),  icon: '📒' },
    { href: '/pro/fitness',   label: t(lang, 'nav_fitness'),   icon: '🏃' },
    { href: '/pro/leads',     label: t(lang, 'nav_leads'),     icon: '📋' },
    { href: '/pro/profile',   label: t(lang, 'nav_profile'),   icon: '👤' },
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
