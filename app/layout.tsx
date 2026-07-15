import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Nunito, Fredoka } from 'next/font/google'
import Script from 'next/script'
import MotionProvider from '@/components/MotionProvider'
import ShellWrapper from '@/components/ShellWrapper'
import InitialLoader from '@/components/InitialLoader'
import RouteProgressBar from '@/components/RouteProgressBar'
import FunnelTracker from '@/components/FunnelTracker'
import './globals.css'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

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
  title: { default: 'PupStep — GPS Walk Reports for Mumbai Dogs', template: '%s | PupStep' },
  description: 'GPS-verified walk reports straight to your WhatsApp. The walk log your Mumbai dog deserves. Know every walk happened. Every time.',
  keywords: ['dog walk tracker Mumbai', 'GPS walk report Mumbai', 'dog walker Juhu', 'dog grooming Mumbai', 'walk accountability Mumbai', 'verified dog walker Mumbai', 'dog care Mumbai'],
  authors: [{ name: 'PupStep' }],
  creator: 'PupStep',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'PupStep',
    title: 'PupStep — GPS Walk Reports for Mumbai Dogs',
    description: 'GPS-verified walk reports to your WhatsApp. Know your dog got walked. Trusted by Mumbai dog parents.',
    images: [{
      url: `${siteUrl}/api/og`,
      width: 1200,
      height: 630,
      alt: 'PupStep — GPS-verified dog walk reports for Mumbai',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PupStep — GPS Walk Reports for Mumbai Dogs',
    description: 'GPS-verified walk reports to your WhatsApp. Know your dog got walked. Trusted by Mumbai dog parents.',
    images: [`${siteUrl}/api/og`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  verification: { google: '2LztnQwPLifOrj3Ns_OhWx_tfRcu4aSwZAsP-fsskeg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
        <InitialLoader />
        <FunnelTracker />
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <MotionProvider>
          <ShellWrapper>{children}</ShellWrapper>
        </MotionProvider>
      </body>
    </html>
  )
}
