import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Nunito, Fredoka } from 'next/font/google'
import Script from 'next/script'
import MotionProvider from '@/components/MotionProvider'
import ShellWrapper from '@/components/ShellWrapper'
import InitialLoader from '@/components/InitialLoader'
import RouteProgressBar from '@/components/RouteProgressBar'
import FunnelTracker from '@/components/FunnelTracker'
import OfflineBanner from '@/components/OfflineBanner'
import './globals.css'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Microsoft Clarity — session replay and heatmaps. The project id is not a
// secret (it ships to every visitor in the page), so it's inlined with an env
// override rather than env-only: env-only would mean the tag silently does
// nothing until someone remembers to set it in Vercel. Same pattern as
// siteUrl below.
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? 'ykx74q9zge'

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
  title: { default: 'PupStep — GPS Walk Reports for Dogs Across India', template: '%s | PupStep' },
  description: 'GPS-verified walk reports straight to your WhatsApp. The walk log your dog deserves — trusted by pet parents from Mumbai to across India. Know every walk happened. Every time.',
  keywords: ['dog walk tracker India', 'GPS walk report India', 'dog walk tracker Mumbai', 'dog walker Juhu', 'dog grooming Mumbai', 'walk accountability app', 'verified dog walker India', 'dog care app India'],
  authors: [{ name: 'PupStep' }],
  creator: 'PupStep',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'PupStep',
    title: 'PupStep — GPS Walk Reports for Dogs Across India',
    description: 'GPS-verified walk reports to your WhatsApp. Know your dog got walked. Trusted by pet parents from Mumbai to across India.',
    images: [{
      url: `${siteUrl}/api/og`,
      width: 1200,
      height: 630,
      alt: 'PupStep — GPS-verified dog walk reports for pet parents across India',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PupStep — GPS Walk Reports for Dogs Across India',
    description: 'GPS-verified walk reports to your WhatsApp. Know your dog got walked. Trusted by pet parents from Mumbai to across India.',
    images: [`${siteUrl}/api/og`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  // Two Search Console properties. The first token verifies the original
  // property and must stay — removing it un-verifies that property and the
  // historical search data with it. Next.js renders one meta tag per entry.
  verification: {
    google: [
      '2LztnQwPLifOrj3Ns_OhWx_tfRcu4aSwZAsP-fsskeg',
      '-04GnLXCcLDjeicvrWo3zJWtHKRW5Yb6qayGafz7wwA',
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {/* Walk reports are the most-opened page (every WhatsApp link lands here) and
            the Maps JS bundle isn't requested until the card hydrates. Warming the
            connection overlaps DNS/TLS with hydration instead of paying for it
            serially once the map effect finally fires. React hoists these into
            <head> on its own — wrapping them in a literal <head> element breaks
            hydration in the App Router and leaves the whole page unhydrated. */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        {/* Clarity records sessions, and walk report pages carry a real dog's
            name, the walker's name, a route map and a doorstep photo. Clarity
            masks form inputs by default but NOT page content, so that detail
            reaches Microsoft unless masking is tightened in the Clarity
            dashboard (Settings → Masking). Flagged, not silently shipped. */}
        {CLARITY_PROJECT_ID && (
          <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
          </Script>
        )}
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
                gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
              `}
            </Script>
          </>
        )}
        <OfflineBanner />
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
