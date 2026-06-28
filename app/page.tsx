import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/LandingPage'

export const metadata: Metadata = {
  title: "PupStep — GPS Walk Reports for Mumbai Dogs",
  description:
    "Your dog gets walked. Now prove it. GPS route, pee/poop map, dog photo — sent to you on WhatsApp after every walk.",
}

export default async function HomePage() {
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
            "description": "GPS walk reports for Mumbai dogs. Your dog gets walked — now prove it.",
            "url": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}`,
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
