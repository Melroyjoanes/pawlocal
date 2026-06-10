import type { Metadata } from 'next'
import { Inter, DM_Serif_Display } from 'next/font/google'
import { headers } from 'next/headers'
import MotionProvider from '@/components/MotionProvider'
import ResponsePrompt from '@/components/ResponsePrompt'
import HeaderSearch from '@/components/HeaderSearch'
import AuthNavItem from '@/components/AuthNavItem'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-serif',
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
  title: { default: 'PupStep — Pet Services in Juhu, Mumbai', template: '%s | PupStep' },
  description: 'Find verified vets, groomers, dog walkers, trainers and pet stores near Juhu, Mumbai. WhatsApp directly. Zero booking fees.',
  keywords: ['pet services Mumbai', 'vets Juhu', 'dog grooming Juhu', 'dog walker Mumbai', 'pet store Juhu', 'emergency vet Mumbai'],
  authors: [{ name: 'PupStep' }],
  creator: 'PupStep',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'PupStep',
    title: 'PupStep — Pet Services in Juhu, Mumbai',
    description: 'Find verified vets, groomers, dog walkers & trainers near Juhu, Mumbai. WhatsApp directly. Zero fees.',
    // og-image.png doesn't exist yet — remove to prevent 404 fallback
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PupStep — Pet Services in Juhu, Mumbai',
    description: 'Verified vets, groomers, walkers & trainers near Juhu. WhatsApp direct. Zero fees.',
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Detect /pro and /admin routes — they have their own isolated shells
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isIsolated = pathname.startsWith('/pro') || pathname.startsWith('/admin') || pathname.startsWith('/track')

  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <MotionProvider>

          {/* Customer header — hidden for /pro and /admin */}
          {!isIsolated && (
            <header className="sticky top-0 z-40" style={{ background: 'rgba(255,251,235,0.94)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid #FDE68A' }}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

                {/* Logo */}
                <a href="/" className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-2xl">🐾</span>
                  <span className="font-display text-xl text-slate-900 leading-none">
                    Pup<span style={{ color: '#D97706' }}>Step</span>
                  </span>
                </a>

                {/* Nav links — desktop */}
                <nav className="hidden md:flex items-center gap-1">
                  {[
                    { href: '/search', label: '🔍 Find' },
                    { href: '/map', label: '🗺 Near me' },
                    { href: '/broadcast', label: '📣 Post a request' },
                  ].map(({ href, label }) => (
                    <a
                      key={href}
                      href={href}
                      className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-amber-50 transition-all"
                    >
                      {label}
                    </a>
                  ))}
                </nav>

                {/* Search — desktop inline, mobile icon */}
                <HeaderSearch />

                {/* Auth — sign in / avatar — provider-aware */}
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
                <p>© {new Date().getFullYear()} PupStep · Juhu, Mumbai</p>
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
