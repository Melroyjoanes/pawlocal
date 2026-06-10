import type { Metadata } from 'next'
import { Nunito, Fredoka } from 'next/font/google'
import { headers } from 'next/headers'
import Image from 'next/image'
import MotionProvider from '@/components/MotionProvider'
import ResponsePrompt from '@/components/ResponsePrompt'
import HeaderSearch from '@/components/HeaderSearch'
import AuthNavItem from '@/components/AuthNavItem'
import MobileDrawer from '@/components/MobileDrawer'
import './globals.css'

// Fredoka — bubbly display font matching the logo lettering
const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

// Nunito — warm, rounded body font
const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // enables env(safe-area-inset-*) on iOS notch/Dynamic Island
}

// Resolve base URL: custom domain → Vercel auto URL → fallback
// Hardcoded stable URL — Next.js on Vercel overrides env-based metadataBase
// with VERCEL_URL (deployment-specific hash URL), breaking og:image for WhatsApp.
const siteUrl = 'https://pupstep.in'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "PupStep — Mumbai's Verified Pet People", template: '%s | PupStep' },
  description: "Mumbai's most trusted pet directory. Find verified walkers, vets, groomers and more near you. WhatsApp direct. Zero booking fees.",
  keywords: ['pet services Mumbai', 'dog walker Mumbai', 'vets Juhu', 'dog grooming Mumbai', 'pet store Juhu', 'emergency vet Mumbai', 'verified pet care Mumbai'],
  authors: [{ name: 'PupStep' }],
  creator: 'PupStep',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'PupStep',
    title: "PupStep — Mumbai's Verified Pet People",
    description: "Mumbai's most trusted pet directory. Verified walkers, vets & groomers — WhatsApp direct, zero fees.",
    images: [{
      url: `${siteUrl}/api/og`,
      width: 1200,
      height: 630,
      alt: "PupStep — Mumbai's verified pet people",
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "PupStep — Mumbai's Verified Pet People",
    description: "Mumbai's most trusted pet directory. Verified walkers, vets & groomers — WhatsApp direct, zero fees.",
    images: [`${siteUrl}/api/og`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  verification: { google: '2LztnQwPLifOrj3Ns_OhWx_tfRcu4aSwZAsP-fsskeg' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Detect /pro and /admin routes — they have their own isolated shells
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isIsolated = pathname.startsWith('/pro') || pathname.startsWith('/admin') || pathname.startsWith('/track')

  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <MotionProvider>

          {/* Customer header — hidden for /pro and /admin */}
          {!isIsolated && (
            <header className="sticky top-0 z-40" style={{ background: 'rgba(255,251,235,0.94)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid oklch(0.906 0.06 88)' }}>

              {/* ── MOBILE header (< md): hamburger | centred logo | auth ── */}
              <div className="md:hidden flex items-center px-3 h-14">
                {/* Left: hamburger */}
                <MobileDrawer />

                {/* Centre: logo — absolute so it's truly centred regardless of side widths */}
                <a href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center">
                  <Image
                    src="/logo.png"
                    alt="PupStep"
                    width={160}
                    height={59}
                    className="h-11 w-auto"
                    priority
                  />
                </a>

                {/* Right: auth avatar / sign-in */}
                <div className="ml-auto flex-shrink-0">
                  <AuthNavItem />
                </div>
              </div>

              {/* ── DESKTOP header (≥ md): logo | nav | search | auth ── */}
              <div className="hidden md:flex max-w-7xl mx-auto px-6 h-16 items-center gap-3">

                {/* Logo */}
                <a href="/" className="flex items-center flex-shrink-0">
                  <Image
                    src="/logo.png"
                    alt="PupStep"
                    width={160}
                    height={59}
                    className="h-12 w-auto"
                    priority
                  />
                </a>

                {/* Nav + search */}
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

                {/* Auth */}
                <AuthNavItem />
              </div>

            </header>
          )}

          {/* Main content — no wrapper constraints for isolated routes */}
          {isIsolated
            ? children
            : <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
          }

          {/* Customer footer — hidden for /pro and /admin */}
          {!isIsolated && (
            <footer className="border-t border-border mt-16 py-8">
              <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Image src="/logo.png" alt="PupStep" width={110} height={40} className="h-8 w-auto opacity-80" />
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
          )}

          {!isIsolated && <ResponsePrompt />}
        </MotionProvider>
      </body>
    </html>
  )
}
