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
    title: `${cat.name} in Juhu, Mumbai | PawLocal`,
    description: `Find trusted ${cat.name.toLowerCase()} services near Juhu, Mumbai. Browse verified providers, compare prices, and contact directly on WhatsApp.`,
  }
}

export default function CategoryPage() {
  return <CategoryPageClient />
}
