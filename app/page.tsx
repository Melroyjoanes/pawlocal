import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/LandingPage'
import AuthRequired from '@/components/AuthRequired'

export const metadata: Metadata = {
  title: 'PawLocal — Pet Services in Juhu, Mumbai',
  description:
    'Find trusted vets, groomers, dog walkers, trainers and pet stores near Juhu, Mumbai. WhatsApp directly. No booking fee.',
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; auth_required?: string; next?: string }>
}) {
  const { area, auth_required, next } = await searchParams
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
      <AuthRequired authRequired={auth_required} next={next} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "PawLocal",
            "description": "Hyperlocal pet services directory for Juhu, Mumbai",
            "url": "https://pawlocal.in",
            "areaServed": { "@type": "City", "name": "Mumbai" },
            "serviceArea": { "@type": "GeoCircle", "geoMidpoint": { "@type": "GeoCoordinates", "latitude": 19.1075, "longitude": 72.8263 }, "geoRadius": "5000" },
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Pet Services",
              "itemListElement": [
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Dog Walking" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Pet Grooming" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Veterinary Services" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Dog Training" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Pet Store" } }
              ]
            }
          })
        }}
      />
      <LandingPage countMap={countMap} totalProviders={totalProviders} neighbourhood={neighbourhood} />
    </>
  )
}
