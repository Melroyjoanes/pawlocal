import type { Metadata } from 'next'
import { Nunito, Fredoka } from 'next/font/google'
import MotionProvider from '@/components/MotionProvider'
import ShellWrapper from '@/components/ShellWrapper'
import './globals.css'

// Fredoka — bubbly display font matching the logo lettering
// Only 2 weights: regular headings (500) + bold CTAs (700)
const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['500', '700'],
  display: 'swap',
})

// Nunito — warm, rounded body font
// 3 weights covers all UI needs: regular body (400), medium labels (600), bold (700)
const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '600', '700'],
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
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <MotionProvider>
          <ShellWrapper>{children}</ShellWrapper>
        </MotionProvider>
      </body>
    </html>
  )
}
