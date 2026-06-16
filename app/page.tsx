import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import LandingPage, { type FeaturedProvider } from '@/components/LandingPage'
import ProviderAutoRedirect from '@/components/ProviderAutoRedirect'

// Revalidate every 5 minutes — provider counts change rarely, no need to hit
// Supabase on every single request. ISR serves cached HTML instantly.
export const revalidate = 300

export const metadata: Metadata = {
  title: 'PupStep — Dog Walk Reports & Pet Services in Juhu, Mumbai',
  description:
    'Your dog walker sends a photo care report after every walk — GPS route, poop count, photos. Find verified walkers, groomers and vets in Juhu, Mumbai. WhatsApp direct. ₹0 fees.',
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>
}) {
  const { area } = await searchParams
  const neighbourhood = area ?? 'Juhu'

  const supabase = await createClient()

  // Try to filter by neighbourhood — gracefully falls back to all if column doesn't exist yet
  let counts: { category_slug: string }[] | null = null
  const { data: filtered, error } = await supabase
    .from('providers')
    .select('category_slug')
    .eq('status', 'approved')
    .eq('neighbourhood', neighbourhood)

  if (error) {
    // Migration 010 not run yet — fall back to all approved providers
    const { data: all } = await supabase
      .from('providers')
      .select('category_slug')
      .eq('status', 'approved')
    counts = all
  } else {
    counts = filtered
  }

  const countMap: Record<string, number> = {}
  counts?.forEach((row) => {
    countMap[row.category_slug] = (countMap[row.category_slug] ?? 0) + 1
  })

  const totalProviders = Object.values(countMap).reduce((a, b) => a + b, 0)

  // Featured providers — top 3 by report count (service role, bypasses RLS)
  let featuredProviders: FeaturedProvider[] = []
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: reportRows } = await admin
      .from('walk_reports')
      .select('provider_id')
      .not('provider_id', 'is', null)

    if (reportRows) {
      const countByProvider: Record<string, number> = {}
      for (const row of reportRows) {
        countByProvider[row.provider_id] = (countByProvider[row.provider_id] ?? 0) + 1
      }
      const topIds = Object.entries(countByProvider)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id]) => id)

      if (topIds.length > 0) {
        const { data: provRows } = await admin
          .from('providers')
          .select('id, name, whatsapp, category_slug')
          .in('id', topIds)
          .eq('status', 'approved')

        if (provRows) {
          featuredProviders = provRows.map(p => ({
            id: p.id,
            name: p.name,
            whatsapp: p.whatsapp ?? null,
            category_slug: p.category_slug,
            reportCount: countByProvider[p.id] ?? 0,
          })).sort((a, b) => b.reportCount - a.reportCount).slice(0, 3)
        }
      }
    }
  } catch {
    // non-blocking — featured strip is optional
  }

  return (
    <>
      {/* WebSite schema — enables sitelinks + brand recognition in Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "PupStep",
            "alternateName": "PupStep — Dog Walk Reports & Pet Services in Juhu Mumbai",
            "url": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}`,
            "potentialAction": {
              "@type": "SearchAction",
              "target": { "@type": "EntryPoint", "urlTemplate": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/search?q={search_term_string}` },
              "query-input": "required name=search_term_string"
            }
          })
        }}
      />
      {/* Organization schema — brand authority signal */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "PupStep",
            "url": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}`,
            "logo": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/api/og`,
            "description": "Care reporting platform for pet parents in Juhu, Mumbai. Verified dog walkers send a photo care report after every walk — GPS route, photos, poop count. Find trusted walkers, groomers, vets.",
            "areaServed": { "@type": "City", "name": "Mumbai", "containedInPlace": { "@type": "Country", "name": "India" } },
            "foundingLocation": { "@type": "Place", "name": "Juhu, Mumbai, India" },
            "sameAs": []
          })
        }}
      />
      {/* LocalBusiness / Directory schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "PupStep",
            "description": "Dog walk reports and pet services in Juhu, Mumbai. Verified dog walkers send photo care reports after every walk. Find trusted walkers, groomers, vets in Juhu. WhatsApp direct. ₹0 fees.",
            "url": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}`,
            "image": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/api/og`,
            "telephone": "",
            "address": { "@type": "PostalAddress", "addressLocality": "Juhu", "addressRegion": "Mumbai", "addressCountry": "IN" },
            "geo": { "@type": "GeoCoordinates", "latitude": 19.1075, "longitude": 72.8263 },
            "areaServed": { "@type": "City", "name": "Mumbai" },
            "serviceArea": { "@type": "GeoCircle", "geoMidpoint": { "@type": "GeoCoordinates", "latitude": 19.1075, "longitude": 72.8263 }, "geoRadius": "10000" },
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Pet Services",
              "itemListElement": [
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Dog Walking", "areaServed": "Mumbai" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Pet Grooming", "areaServed": "Mumbai" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Veterinary Services", "areaServed": "Mumbai" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Dog Training", "areaServed": "Mumbai" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Pet Store", "areaServed": "Mumbai" } }
              ]
            },
            "priceRange": "₹0 booking fees"
          })
        }}
      />
      {/* HowTo schema — rich result for "how to find a dog walker" queries */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": "How to find a verified dog walker in Juhu, Mumbai",
            "description": "Find a trusted, verified dog walker in Juhu, Mumbai who sends a photo care report after every walk.",
            "totalTime": "PT5M",
            "estimatedCost": { "@type": "MonetaryAmount", "currency": "INR", "value": "0" },
            "step": [
              {
                "@type": "HowToStep",
                "name": "Browse verified walkers",
                "text": "Visit the dog walking section on PupStep and browse verified walkers near Juhu. Every profile shows services, area covered, and the number of care reports sent.",
                "url": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/dog-walking`
              },
              {
                "@type": "HowToStep",
                "name": "Contact on WhatsApp",
                "text": "Tap the WhatsApp button on any profile to contact the walker directly. No booking fee, no middleman."
              },
              {
                "@type": "HowToStep",
                "name": "Receive care reports",
                "text": "After every walk, your walker logs the session — GPS route, photos, poop count, duration. You receive a care report link. Save it to your PupStep account."
              }
            ]
          })
        }}
      />
      {/* Updated FAQ with care report questions */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is PupStep?",
                "acceptedAnswer": { "@type": "Answer", "text": "PupStep is a care reporting platform and pet services directory for Juhu, Mumbai. Verified walkers and groomers send you a photo care report after every session. Zero booking fees." }
              },
              {
                "@type": "Question",
                "name": "What is a care report on PupStep?",
                "acceptedAnswer": { "@type": "Answer", "text": "After every walk or grooming session, your provider logs the session on PupStep. You receive a care report with your dog's photo, GPS walk route, duration, poop count, and notes. Reports are saved to your account so you can track your dog's health history over time." }
              },
              {
                "@type": "Question",
                "name": "How do I find a dog walker in Juhu who sends walk reports?",
                "acceptedAnswer": { "@type": "Answer", "text": `Visit ${process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : 'pupstep.in'}/dog-walking to browse verified dog walkers in Juhu who are registered on PupStep. Every walker on the platform can send walk reports after each session. Contact them directly on WhatsApp.` }
              },
              {
                "@type": "Question",
                "name": "Are pet service providers on PupStep verified?",
                "acceptedAnswer": { "@type": "Answer", "text": "Yes. Every provider on PupStep is manually reviewed by our team before getting a Verified badge. We check their identity, experience, and references." }
              },
              {
                "@type": "Question",
                "name": "Does PupStep charge a booking fee?",
                "acceptedAnswer": { "@type": "Answer", "text": "No. PupStep is completely free to use. You contact providers directly on WhatsApp and pay them directly. We never charge a booking fee or commission." }
              },
              {
                "@type": "Question",
                "name": "Which areas in Mumbai does PupStep cover?",
                "acceptedAnswer": { "@type": "Answer", "text": "PupStep currently focuses on Juhu, Versova, Andheri West, and Santacruz West in Mumbai. We are expanding to more neighbourhoods." }
              }
            ]
          })
        }}
      />
      <ProviderAutoRedirect />
      <LandingPage countMap={countMap} totalProviders={totalProviders} neighbourhood={neighbourhood} featuredProviders={featuredProviders} />
    </>
  )
}
