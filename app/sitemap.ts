import type { MetadataRoute } from 'next'

export const revalidate = 86400 // rebuild sitemap once per day

// Only real, live pages belong here. This previously listed /map, /broadcast,
// /search, /join, every provider category page (dog-walking, grooming, etc.),
// and every /provider/[id] profile — every one of those is now a permanent
// redirect back to / (see next.config.ts redirects), left over from the V1
// directory/marketplace product. A sitemap that resubmits dead redirect URLs
// to Google every day is exactly how stale "PupStep is a pet directory"
// copy stays alive in search results long after the product changed —
// Google was being told those pages were current and important, daily.
const BLOG_SLUGS = [
  'how-to-choose-dog-walker-mumbai',
  'what-is-a-care-report',
  'dog-grooming-guide-mumbai',
  'juhu-pet-community',
  'vet-visit-checklist-mumbai',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                     lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/faq`,            lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/blog`,           lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/contact`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/walker-guide`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/terms`,          lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/refund-policy`,  lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]

  const blogRoutes: MetadataRoute.Sitemap = BLOG_SLUGS.map(slug => ({
    url: `${base}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...blogRoutes]
}
