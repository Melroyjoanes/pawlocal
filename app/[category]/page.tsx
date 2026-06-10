import type { Metadata } from 'next'
import { getCategoryBySlug } from '@/lib/categories'
import CategoryPageClient from './CategoryPageClient'

// Per-category keyword clusters — keyword-first titles outperform brand-first for non-branded searches
const CATEGORY_SEO: Record<string, { title: string; description: string; keywords: string[] }> = {
  'dog-walking': {
    title: 'Dog Walker in Mumbai — Verified, WhatsApp Direct | PupStep',
    description: 'Find trusted dog walkers in Mumbai. GPS walk reports, verified profiles, zero booking fees. Contact directly on WhatsApp.',
    keywords: ['dog walker Mumbai', 'dog walker Juhu', 'dog walking service Mumbai', 'professional dog walker near me', 'dog walking Juhu Mumbai'],
  },
  'grooming': {
    title: 'Pet Grooming in Mumbai — Verified Groomers Near You | PupStep',
    description: 'Book trusted pet groomers in Mumbai. Bath, trim, styling for dogs and cats. Verified profiles, WhatsApp direct, zero fees.',
    keywords: ['pet grooming Mumbai', 'dog grooming Juhu', 'dog groomer near me Mumbai', 'pet grooming salon Juhu', 'cat grooming Mumbai'],
  },
  'vet': {
    title: 'Vet Near Me Mumbai — Trusted Pet Clinics & Doctors | PupStep',
    description: 'Find trusted vets and pet clinics in Mumbai. Verified veterinarians, emergency vet services. WhatsApp direct, zero booking fees.',
    keywords: ['vet near me Mumbai', 'veterinary clinic Juhu', 'dog doctor Mumbai', 'emergency vet Mumbai', 'pet clinic Juhu Mumbai'],
  },
  'pet-store': {
    title: 'Pet Store Mumbai — Dog Food, Accessories & Supplies | PupStep',
    description: 'Find pet stores near you in Mumbai. Dog food, accessories, grooming supplies. Verified local stores, WhatsApp direct.',
    keywords: ['pet store Mumbai', 'pet shop Juhu', 'dog food store Mumbai', 'pet accessories Mumbai', 'pet supply store Juhu'],
  },
  'dog-training': {
    title: 'Dog Trainer Mumbai — Obedience & Puppy Training Near You | PupStep',
    description: 'Find certified dog trainers in Mumbai. Puppy training, obedience, behaviour correction. Verified trainers, WhatsApp direct.',
    keywords: ['dog trainer Mumbai', 'dog training Juhu', 'puppy training Mumbai', 'obedience training dog Mumbai', 'dog behaviour trainer Juhu'],
  },
  'insurance': {
    title: 'Pet Insurance India — Compare Plans for Dogs & Cats | PupStep',
    description: 'Compare the best pet insurance plans in India. Cover for accidents, illness, surgery. Find the right plan for your dog or cat.',
    keywords: ['pet insurance India', 'dog insurance Mumbai', 'cat insurance India', 'best pet insurance India', 'pet health insurance'],
  },
}

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> }
): Promise<Metadata> {
  const { category } = await params
  const cat = getCategoryBySlug(category)
  if (!cat) return { title: 'Not found' }

  const seo = CATEGORY_SEO[category]
  const title       = seo?.title       ?? `${cat.name} in Mumbai | PupStep`
  const description = seo?.description ?? `Find trusted ${cat.name.toLowerCase()} services in Mumbai. Verified providers, WhatsApp direct. Zero booking fees.`
  const keywords    = seo?.keywords    ?? [`${cat.name.toLowerCase()} Mumbai`, `${cat.name.toLowerCase()} Juhu`]

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `https://pupstep.in/${category}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://pupstep.in/${category}`,
      siteName: 'PupStep',
    },
    twitter: { card: 'summary', title, description },
  }
}

export default function CategoryPage() {
  return <CategoryPageClient />
}
