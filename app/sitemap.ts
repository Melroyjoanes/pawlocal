import type { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/categories'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://pupstep.in'
  const staticRoutes = ['/', '/map', '/broadcast', '/join', '/insurance']
  const categoryRoutes = CATEGORIES.map(c => `/${c.slug}`)

  return [...staticRoutes, ...categoryRoutes].map(path => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : path.startsWith('/map') ? 0.9 : 0.8,
  }))
}
