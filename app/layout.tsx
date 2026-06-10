import type { Metadata } from 'next'
import { Nunito, Fredoka } from 'next/font/google'
import { headers } from 'next/headers'
import Image from 'next/image'
import MotionProvider from '@/components/MotionProvider'
import ResponsePrompt from '@/components/ResponsePrompt'
import HeaderSearch from '@/components/HeaderSearch'
import AuthNavItem from '@/components/AuthNavItem'
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
              <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center gap-2 sm:gap-3">

                {/* Logo — actual PupStep logo asset */}
                <a href="/" className="flex items-center flex-shrink-0">
                  <Image
                    src="/logo.png"
                    alt="PupStep"
                    width={130}
                    height={44}
                    className="h-9 sm:h-10 w-auto mix-blend-multiply"
                    priority
                  />
                </a>

                {/* Middle group: nav (desktop) + search (grows on mobile) */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">

                  {/* Nav links — desktop only, text-only (no emoji) */}
                  <nav className="hidden md:flex items-center gap-0.5 mr-1">
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

                  {/* Search — flex-1 on mobile fills remaining space; fixed width on desktop */}
                  <HeaderSearch />
                </div>

                {/* Auth — sign in / avatar */}
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
                  <Image src="/logo.png" alt="PupStep" width={90} height={30} className="h-7 w-auto mix-blend-multiply opacity-75" />
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
