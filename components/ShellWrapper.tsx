'use client'

import { usePathname } from 'next/navigation'
import Image from 'next/image'
import MobileDrawer from '@/components/MobileDrawer'
import HeaderSearch from '@/components/HeaderSearch'
import AuthNavItem from '@/components/AuthNavItem'
import ResponsePrompt from '@/components/ResponsePrompt'

export default function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isIsolated =
    pathname.startsWith('/pro') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/track') ||
    pathname.startsWith('/walk-report')

  if (isIsolated) return <>{children}</>

  return (
    <>
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(255,251,235,0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid oklch(0.906 0.06 88)',
        }}
      >
        {/* ── MOBILE header (< md): hamburger | centred logo | auth ── */}
        <div className="md:hidden flex items-center px-3 h-14">
          <MobileDrawer />
          <a href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center">
            <Image src="/logo.webp" alt="PupStep" width={160} height={59} className="h-11 w-auto" priority />
          </a>
          <div className="ml-auto flex-shrink-0">
            <AuthNavItem />
          </div>
        </div>

        {/* ── DESKTOP header (≥ md): logo | nav | search | auth ── */}
        <div className="hidden md:flex max-w-7xl mx-auto px-6 h-16 items-center gap-3">
          <a href="/" className="flex items-center flex-shrink-0">
            <Image src="/logo.webp" alt="PupStep" width={160} height={59} className="h-12 w-auto" priority />
          </a>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <nav className="flex items-center gap-0.5 mr-1">
              {[
                { href: '/search', label: 'Find' },
                { href: '/map', label: 'Near me' },
                { href: '/broadcast', label: 'Post request' },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-amber-50 transition-all whitespace-nowrap"
                >
                  {label}
                </a>
              ))}
            </nav>
            <HeaderSearch />
          </div>
          <AuthNavItem />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>

      <footer className="border-t border-border mt-16 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Image src="/logo.webp" alt="PupStep" width={110} height={40} className="h-8 w-auto opacity-80" />
            <span className="text-stone-400">· © {new Date().getFullYear()} · Juhu, Mumbai</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/search" className="hover:text-foreground transition-colors">Find services</a>
            <a href="/map" className="hover:text-foreground transition-colors">All on map</a>
            <a href="/broadcast" className="hover:text-foreground transition-colors">Post a request</a>
            <a href="/insurance" className="hover:text-foreground transition-colors">Pet insurance</a>
          </div>
        </div>
      </footer>

      <ResponsePrompt />
    </>
  )
}
