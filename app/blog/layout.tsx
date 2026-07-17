import type { Metadata } from 'next'

// app/blog/page.tsx is a client component (framer-motion), so its metadata
// lives here instead. Post-level metadata is generateMetadata in [slug]/page.tsx.
export const metadata: Metadata = {
  title: 'Blog — Guides & Tips for Dog Parents Across India',
  description:
    'Practical guides for dog parents across India — monsoon walking safety, choosing and verifying dog walkers, grooming, vet visits, and neighbourhood tips from Mumbai\'s Juhu to Andheri West.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/blog`,
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
