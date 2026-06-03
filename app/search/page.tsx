import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, getCategoryBySlug } from '@/lib/categories'
import type { ProviderWithPhotos, CategorySlug } from '@/lib/supabase/types'
import ProviderCard from '@/components/ProviderCard'
import SearchBar from '@/components/SearchBar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; cat?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams
  const query = q?.trim() ?? ''
  return {
    title: query ? `"${query}" — Search` : 'Search Pet Services',
    description: `Search pet services in Juhu, Mumbai${query ? ` for "${query}"` : ''}.`,
  }
}

// Skeleton for loading (used as the exported default when Suspense boundary is needed)
function ProviderCardSkeleton() {
  return (
    <div className="flex gap-4 bg-white p-4 rounded-2xl border border-border animate-pulse">
      <div className="w-[88px] h-[88px] rounded-xl bg-stone-100 flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-stone-100 rounded w-2/3" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
        <div className="h-3 bg-stone-100 rounded w-3/4" />
        <div className="flex gap-2 mt-3">
          <div className="h-7 w-20 bg-stone-100 rounded-full" />
          <div className="h-7 w-16 bg-stone-100 rounded-full" />
        </div>
      </div>
    </div>
  )
}

const CATEGORY_FILTERS = [
  { label: 'All', value: '' },
  { label: '🦮 Dog Walking', value: 'dog-walking' },
  { label: '✂️ Grooming', value: 'grooming' },
  { label: '🏥 Vet', value: 'vet' },
  { label: '🐾 Pet Store', value: 'pet-store' },
  { label: '🎯 Training', value: 'dog-training' },
  { label: '🛡️ Insurance', value: 'insurance' },
]

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, cat } = await searchParams
  const query = q?.trim() ?? ''
  const activeCategory = cat?.trim() ?? ''

  let providers: ProviderWithPhotos[] = []
  let usedFallback = false

  if (query) {
    const supabase = await createClient()

    // Primary: FTS
    let { data: ftsData, error: ftsError } = await supabase
      .from('providers')
      .select('*, provider_photos(*)')
      .eq('status', 'approved')
      .textSearch('fts', query, { type: 'websearch', config: 'english' })
      .limit(20)

    if (!ftsError && ftsData && ftsData.length > 0) {
      providers = ftsData as unknown as ProviderWithPhotos[]
    } else {
      // Fallback: ilike on name
      usedFallback = true
      const { data: fallbackData } = await supabase
        .from('providers')
        .select('*, provider_photos(*)')
        .eq('status', 'approved')
        .ilike('name', `%${query}%`)
        .limit(20)
      providers = (fallbackData ?? []) as unknown as ProviderWithPhotos[]
    }
  }

  // Apply category filter client-side (all data already fetched)
  const filtered = activeCategory
    ? providers.filter(
        (p) =>
          p.category_slug === activeCategory ||
          (p.category_slugs ?? []).includes(activeCategory)
      )
    : providers

  // Build filter chip URLs
  function buildFilterUrl(catValue: string) {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (catValue) params.set('cat', catValue)
    return `/search?${params.toString()}`
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Search bar */}
      <div className="mb-6">
        <SearchBar defaultValue={query} className="w-full" />
      </div>

      {query ? (
        <>
          {/* Category filter chips */}
          <div className="flex gap-2 flex-wrap mb-5">
            {CATEGORY_FILTERS.map(({ label, value }) => {
              const isActive = value === activeCategory
              return (
                <Link
                  key={value}
                  href={buildFilterUrl(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-transparent text-white'
                      : 'border-border bg-white text-muted-foreground hover:border-[var(--pl-teal)] hover:text-foreground'
                  }`}
                  style={
                    isActive
                      ? { background: 'var(--pl-teal)', borderColor: 'var(--pl-teal)' }
                      : {}
                  }
                >
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length === 0
              ? `No results for "${query}"`
              : `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${query}"`}
            {activeCategory && filtered.length > 0 && (
              <span className="ml-1">
                in{' '}
                <span className="font-medium text-foreground">
                  {CATEGORY_FILTERS.find((c) => c.value === activeCategory)?.label ?? activeCategory}
                </span>
              </span>
            )}
          </p>

          {/* Results list */}
          {filtered.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filtered.map((provider) => {
                const category =
                  getCategoryBySlug(provider.category_slug) ?? {
                    slug: provider.category_slug as CategorySlug,
                    name: provider.category_slug,
                    icon: '🐾',
                    color: '#059669',
                    bgColor: 'bg-emerald-50',
                    tagline: '',
                    description: '',
                  }
                return (
                  <ProviderCard key={provider.id} provider={provider} category={category} />
                )
              })}
            </div>
          ) : (
            /* Empty state */
            <div className="text-center py-16 px-4">
              <div className="text-5xl mb-4">🐾</div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                No results for &ldquo;{query}&rdquo;
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
                We couldn&apos;t find any pet services matching your search. Try a different keyword or browse by category.
              </p>

              {/* Browse categories */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Browse categories
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white text-sm hover:border-[var(--pl-teal)] transition-colors"
                  >
                    <span>{cat.icon}</span>
                    <span className="font-medium">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* No query — prompt to search */
        <div className="text-center py-16 px-4">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Find pet services near you
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Search for vets, groomers, dog walkers, trainers, and more in Juhu, Mumbai.
          </p>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Popular categories
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white text-sm hover:border-[var(--pl-teal)] transition-colors"
              >
                <span>{cat.icon}</span>
                <span className="font-medium">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
