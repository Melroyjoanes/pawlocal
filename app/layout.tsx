import type { Metadata } from 'next'
import { Inter, DM_Serif_Display } from 'next/font/google'
import MotionProvider from '@/components/MotionProvider'
import OnboardingSheet from '@/components/OnboardingSheet'
import LocationPicker from '@/components/LocationPicker'
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

export const metadata: Metadata = {
  metadataBase: new URL('https://pawlocal.in'),
  title: { default: 'PawLocal — Pet Services in Juhu, Mumbai', template: '%s | PawLocal' },
  description: 'Find verified vets, groomers, dog walkers, trainers and pet stores near Juhu, Mumbai. WhatsApp directly. Zero booking fees.',
  keywords: ['pet services Mumbai', 'vets Juhu', 'dog grooming Juhu', 'dog walker Mumbai', 'pet store Juhu', 'emergency vet Mumbai'],
  authors: [{ name: 'PawLocal' }],
  creator: 'PawLocal',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://pawlocal.in',
    siteName: 'PawLocal',
    title: 'PawLocal — Pet Services in Juhu, Mumbai',
    description: 'Find verified vets, groomers, dog walkers & trainers near Juhu, Mumbai. WhatsApp directly. Zero fees.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PawLocal — Pet Services in Mumbai' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PawLocal — Pet Services in Juhu, Mumbai',
    description: 'Verified vets, groomers, walkers & trainers near Juhu. WhatsApp direct. Zero fees.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <MotionProvider>
          {/* Header */}
          <header className="sticky top-0 z-40" style={{ background: 'rgba(255,251,235,0.94)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid #FDE68A' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

              {/* Logo */}
              <a href="/" className="flex items-center gap-2 flex-shrink-0">
                <span className="text-2xl">🐾</span>
                <span className="font-display text-xl text-slate-900 leading-none">
                  Paw<span style={{ color: '#D97706' }}>Local</span>
                </span>
              </a>

              {/* Location picker */}
              <LocationPicker />

              {/* Nav links — desktop */}
              <nav className="hidden md:flex items-center gap-1">
                {[
                  { href: '/map', label: '🗺 Map' },
                  { href: '/broadcast', label: '📣 Broadcast' },
                  { href: '/account', label: '👤 Account' },
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

              {/* Account icon — mobile */}
              <a
                href="/account"
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:bg-amber-50 transition-all flex-shrink-0"
                aria-label="My account"
              >
                👤
              </a>

              {/* CTA */}
              <a
                href="/join"
                className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-full flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
                  color: '#451A03',
                  boxShadow: '0 4px 0px rgba(120,53,15,0.28), 0 8px 20px rgba(252,211,77,0.4)',
                }}
              >
                <span className="hidden sm:inline">+ List free</span>
                <span className="sm:hidden">+ List</span>
              </a>
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>

          <footer className="border-t border-border mt-16 py-8">
            <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} PawLocal · Juhu, Mumbai</p>
              <div className="flex items-center gap-4">
                <a href="/map" className="hover:text-foreground transition-colors">All on map</a>
                <a href="/broadcast" className="hover:text-foreground transition-colors">Broadcast</a>
                <a href="/join" className="hover:text-foreground transition-colors">List your service</a>
                <a href="/insurance" className="hover:text-foreground transition-colors">Pet insurance</a>
              </div>
            </div>
          </footer>
          <OnboardingSheet />
        </MotionProvider>
      </body>
    </html>
  )
}
