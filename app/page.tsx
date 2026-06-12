import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/LandingPage'
import ProviderAutoRedirect from '@/components/ProviderAutoRedirect'

// Revalidate every 5 minutes — provider counts change rarely, no need to hit
// Supabase on every single request. ISR serves cached HTML instantly.
export const revalidate = 300

export const metadata: Metadata = {
  title: "PupStep — Mumbai's Verified Pet People",
  description:
    "Mumbai's most trusted pet directory. Find verified walkers, vets, groomers and more near you. WhatsApp direct. Zero booking fees.",
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
            "alternateName": "PupStep — Mumbai's Verified Pet People",
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
            "description": "Mumbai's most trusted hyperlocal pet services directory. Verified walkers, vets, groomers and more — WhatsApp direct, zero booking fees.",
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
            "description": "Mumbai's verified pet people. Find trusted dog walkers, vets, groomers, trainers and pet stores near you.",
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
      {/* FAQ schema — triggers rich result accordion in Google search */}
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
                "acceptedAnswer": { "@type": "Answer", "text": "PupStep is Mumbai's verified pet services directory. We list trusted dog walkers, vets, groomers, trainers and pet stores — all manually verified by our team. You contact providers directly on WhatsApp. Zero booking fees." }
              },
              {
                "@type": "Question",
                "name": "How do I find a dog walker in Mumbai on PupStep?",
                "acceptedAnswer": { "@type": "Answer", "text": `Visit ${process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : 'pupstep.in'}/dog-walking to browse verified dog walkers near you in Mumbai. Each walker has a detailed profile with reviews, GPS walk reports, and a direct WhatsApp button. No middleman, no booking fees.` }
              },
              {
                "@type": "Question",
                "name": "Are pet service providers on PupStep verified?",
                "acceptedAnswer": { "@type": "Answer", "text": "Yes. Every provider on PupStep is manually reviewed by our team before getting a Verified badge. We check their identity, experience, and references. You can also read real reviews from other pet parents." }
              },
              {
                "@type": "Question",
                "name": "Does PupStep charge a booking fee?",
                "acceptedAnswer": { "@type": "Answer", "text": "No. PupStep is completely free to use. You contact providers directly on WhatsApp and pay them directly. We never charge a booking fee or commission." }
              },
              {
                "@type": "Question",
                "name": "Which areas in Mumbai does PupStep cover?",
                "acceptedAnswer": { "@type": "Answer", "text": "PupStep currently focuses on Juhu, Versova, Andheri West, and surrounding areas in Mumbai. We are expanding to more neighbourhoods. Post a request on Pet Broadcast and nearby providers will reply." }
              },
              {
                "@type": "Question",
                "name": "How do I find a vet near me in Mumbai?",
                "acceptedAnswer": { "@type": "Answer", "text": `Visit ${process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : 'pupstep.in'}/vet to find trusted veterinary clinics near you in Mumbai. All vets are verified. You can see their location on a map, read reviews, and WhatsApp them directly.` }
              }
            ]
          })
        }}
      />
      <ProviderAutoRedirect />
      <LandingPage countMap={countMap} totalProviders={totalProviders} neighbourhood={neighbourhood} />
    </>
  )
}
