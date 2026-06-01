import type { Metadata } from 'next'
import { Inter, DM_Serif_Display } from 'next/font/google'
import MotionProvider from '@/components/MotionProvider'
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
  title: 'PawLocal — Pet Services in Juhu, Mumbai',
  description: 'Find trusted dog walkers, groomers, vets, pet stores and insurance near Juhu, Mumbai. Every listing reviewed.',
  openGraph: {
    title: 'PawLocal — Pet Services in Juhu, Mumbai',
    description: 'Find trusted dog walkers, groomers, vets, pet stores near Juhu.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <MotionProvider>
          {/* Header */}
          <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-border">
            <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <a href="/" className="flex items-center gap-2 group">
                  <span className="text-xl">🐾</span>
                  <span className="text-lg font-bold tracking-tight text-foreground">
                    Paw<span style={{ color: 'var(--pl-teal)' }}>Local</span>
                  </span>
                </a>
                <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2.5 py-1">
                  📍 Juhu, Mumbai
                </span>
              </div>

              <a
                href="/join"
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors bg-[var(--pl-teal)] text-white hover:bg-[var(--pl-teal-hover)]"
              >
                <span>+</span> List your service
              </a>
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>

          <footer className="border-t border-border mt-16 py-8">
            <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} PawLocal · Juhu, Mumbai</p>
              <div className="flex items-center gap-4">
                <a href="/join" className="hover:text-foreground transition-colors">List your service</a>
                <a href="/insurance" className="hover:text-foreground transition-colors">Pet insurance</a>
              </div>
            </div>
          </footer>
        </MotionProvider>
      </body>
    </html>
  )
}
