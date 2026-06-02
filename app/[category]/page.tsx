import type { Metadata } from 'next'
import { getCategoryBySlug } from '@/lib/categories'
import CategoryPageClient from './CategoryPageClient'

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> }
): Promise<Metadata> {
  const { category } = await params
  const cat = getCategoryBySlug(category)
  if (!cat) return { title: 'Not found' }
  return {
    title: `${cat.name} in Juhu, Mumbai`,
    description: `Find trusted ${cat.name.toLowerCase()} services near Juhu, Mumbai. Browse ${cat.name.toLowerCase()} providers, read reviews, and contact directly on WhatsApp. Zero booking fees.`,
    openGraph: {
      title: `${cat.name} near Juhu, Mumbai | PawLocal`,
      description: `Verified ${cat.name.toLowerCase()} providers near Juhu. WhatsApp direct.`,
      type: 'website',
    },
    alternates: { canonical: `https://pawlocal.in/${category}` },
  }
}

export default function CategoryPage() {
  return <CategoryPageClient />
}
