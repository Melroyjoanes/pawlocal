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
    pathname.startsWith('/walk-report') ||
    pathname.startsWith('/connect') ||
    pathname.startsWith('/walker') ||
    pathname.startsWith('/live') ||
    // Parent app pages — these have their own app shell (sticky header + bottom nav)
    pathname === '/home' ||
    pathname === '/my-account' ||
    pathname.startsWith('/my-reports') ||
    pathname.startsWith('/my-dogs') ||
    pathname === '/setup' ||
    pathname.startsWith('/setup/') ||
    pathname === '/upgrade' ||
    pathname.startsWith('/walker-guide') ||
    pathname === '/install' ||
    // Focused auth screens — a sign-in card doesn't need the marketplace
    // header/footer around it, it's a dead end for a task the user wants
    // to finish in one glance
    pathname === '/login' ||
    pathname === '/account'

  if (isIsolated) return <>{children}</>

  return (
    <>
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(255,251,235,0.97)',
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
                { href: '/upgrade', label: 'Pricing' },
                { href: '/blog', label: 'Blog' },
                { href: '/faq', label: 'FAQs' },
                { href: '/contact', label: 'Contact' },
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
          </div>
          <AuthNavItem />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>

      <footer style={{ background: '#0A2F35' }}>
        {/* Top grid */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-12 pb-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Brand col */}
          <div className="col-span-2 sm:col-span-1">
            <div className="inline-flex mb-3 rounded-xl px-2 py-1" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <Image src="/logo.webp" alt="PupStep" width={130} height={48} className="h-10 w-auto" />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              GPS walk reports for Mumbai dog parents. Share with your walker, get a WhatsApp report after every walk.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Product</p>
            {[
              { href: '/setup', label: 'Set up your dog' },
              { href: '/home', label: 'Walk dashboard' },
              { href: '/upgrade', label: 'Pricing' },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="block text-sm mb-2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                {label}
              </a>
            ))}
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Company</p>
            {[
              { href: '/blog', label: 'Blog' },
              { href: '/faq', label: 'FAQs' },
              { href: '/contact', label: 'Contact us' },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="block text-sm mb-2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                {label}
              </a>
            ))}
            {/* WhatsApp CTA */}
            <a href="https://wa.me/919892620677" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{ background: 'rgba(37,211,102,0.18)', color: '#4ADE80' }}>
              💬 WhatsApp us
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © {new Date().getFullYear()} PupStep · Juhu, Mumbai · Every listing manually verified.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {[
              { href: '/privacy-policy', label: 'Privacy Policy' },
              { href: '/terms', label: 'Terms' },
              { href: '/refund-policy', label: 'Refund Policy' },
              { href: '/faq', label: 'FAQs' },
              { href: '/contact', label: 'Contact' },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="text-xs transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <ResponsePrompt />
    </>
  )
}
