import type { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/categories'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 86400 // rebuild sitemap once per day

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/map`,         lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/broadcast`,   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/join`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/insurance`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/search`,      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map(c => ({
    url: `${base}/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }))

  // Include all approved provider profile pages
  let providerRoutes: MetadataRoute.Sitemap = []
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin.from('providers') as any)
      .select('id, updated_at')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false })

    providerRoutes = (data ?? []).map((p: { id: string; updated_at: string }) => ({
      url: `${base}/provider/${p.id}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }))
  } catch { /* non-fatal — static routes still ship */ }

  return [...staticRoutes, ...categoryRoutes, ...providerRoutes]
}
