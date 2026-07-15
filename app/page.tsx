import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/LandingPage'

export const metadata: Metadata = {
  title: "PupStep — GPS Walk Reports for Mumbai Dogs",
  description:
    "Your dog gets walked. Now prove it. GPS route, pee/poop map, dog photo — sent to you on WhatsApp after every walk.",
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams

  // Referral capture: the visitor isn't logged in yet, so we can't attribute
  // this to a user account here. Just persist the intent in a short-lived
  // cookie — attribution happens later, on first dog creation (app/api/dogs).
  if (ref) {
    const cookieStore = await cookies()
    cookieStore.set('pupstep_ref', ref, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/home')

  return (
    <>
      {/* WebSite schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "PupStep",
            "alternateName": "PupStep GPS Dog Walk Tracker",
            "description": "PupStep is a GPS dog walk verification app for Mumbai dog parents, not a directory or marketplace. Your own walker — maid, watchman, family friend, or regular walker — logs the walk, and you get a GPS-tracked proof-of-walk report on WhatsApp within seconds.",
            "url": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}`,
          })
        }}
      />
      {/* Organization schema — reinforces brand entity for Knowledge Panel / AI Overview */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "PupStep",
            "url": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}`,
            "description": "PupStep is a GPS walk-verification service for Mumbai dog parents. It is not a pet services directory or marketplace — dog parents keep their own walker and use PupStep to get a GPS-tracked, WhatsApp-delivered proof-of-walk report after every walk.",
            "areaServed": { "@type": "City", "name": "Mumbai" },
          })
        }}
      />
      {/* FAQ schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Is PupStep a directory of dog walkers, vets, or groomers?",
                "acceptedAnswer": { "@type": "Answer", "text": "No. PupStep is not a marketplace or directory and does not list or book providers. Dog parents keep the walker they already trust and use PupStep to get a GPS-tracked proof-of-walk report on WhatsApp after every walk." }
              },
              {
                "@type": "Question",
                "name": "Does the walker need to download an app?",
                "acceptedAnswer": { "@type": "Answer", "text": "No. They open a link on WhatsApp. No App Store, no signup." }
              },
              {
                "@type": "Question",
                "name": "How does the walker connect?",
                "acceptedAnswer": { "@type": "Answer", "text": "You share a QR code or WhatsApp link. They enter a 4-digit code you show them. Done." }
              },
              {
                "@type": "Question",
                "name": "What happens after my free trial?",
                "acceptedAnswer": { "@type": "Answer", "text": "Reports from the last 3 days stay visible. Older history is locked until you upgrade for ₹199/month." }
              },
              {
                "@type": "Question",
                "name": "Who pays?",
                "acceptedAnswer": { "@type": "Answer", "text": "You (the dog parent) pay for the subscription. Your walker uses PupStep for free." }
              },
            ]
          })
        }}
      />
      <LandingPage />
    </>
  )
}
