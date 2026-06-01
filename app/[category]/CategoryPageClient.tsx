'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getCategoryBySlug } from '@/lib/categories'
import type { ProviderWithPhotos, CategorySlug } from '@/lib/supabase/types'
import ProviderCard from '@/components/ProviderCard'
import dynamic from 'next/dynamic'

const ProviderMap = dynamic(() => import('@/components/ProviderMap'), { ssr: false })

// Skeleton card shown while loading
function ProviderCardSkeleton() {
  return (
    <div className="flex gap-4 bg-white p-4 rounded-2xl border border-border animate-pulse">
      <div className="w-[88px] h-[88px] rounded-xl bg-stone-200 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="h-4 bg-stone-200 rounded-full w-2/5" />
          <div className="h-4 bg-stone-200 rounded-full w-1/6" />
        </div>
        <div className="h-3 bg-stone-200 rounded-full w-1/3 mt-2" />
        <div className="h-3 bg-stone-200 rounded-full w-3/5 mt-1.5" />
        <div className="flex gap-2 mt-3">
          <div className="h-7 bg-stone-200 rounded-full w-24" />
          <div className="h-7 bg-stone-200 rounded-full w-16" />
        </div>
      </div>
    </div>
  )
}

const EASE_OUT_QUART = [0.25, 0.46, 0.45, 0.94] as const

export default function CategoryPage() {
  const params = useParams()
  const slug = params.category as string
  const category = getCategoryBySlug(slug)

  const [providers, setProviders] = useState<ProviderWithPhotos[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!category) return
    const supabase = createClient()
    supabase
      .from('providers')
      .select('*, provider_photos(*)')
      .eq('category_slug', slug as CategorySlug)
      .eq('status', 'approved')
      .order('is_verified', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProviders((data as unknown as ProviderWithPhotos[]) ?? [])
        setLoading(false)
      })
  }, [slug, category])

  if (!category) {
    return <div className="py-20 text-center text-muted-foreground">Category not found.</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-7">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: category.color + '18' }}
        >
          {category.icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">{category.name}</h1>
          <p className="text-sm text-muted-foreground">{category.tagline} · Juhu, Mumbai</p>
        </div>
        {!loading && (
          <span className="ml-auto text-xs text-muted-foreground">
            {providers.length} {providers.length === 1 ? 'result' : 'results'}
          </span>
        )}
      </div>

      {/* View toggle */}
      <div className="flex gap-1.5 mb-6 p-1 bg-muted rounded-xl w-fit">
        {(['list', 'map'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === v
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {view === v && (
              <motion.span
                layoutId="view-pill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                transition={{ duration: 0.18, ease: EASE_OUT_QUART }}
              />
            )}
            <span className="relative z-10">
              {v === 'list' ? '☰ List' : '🗺 Map'}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProviderCardSkeleton key={i} />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
          className="py-20 text-center"
        >
          <p className="text-muted-foreground mb-4">No providers listed yet in this area.</p>
          <a
            href="/join"
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--pl-teal)' }}
          >
            Be the first to list →
          </a>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              {providers.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    ease: EASE_OUT_QUART,
                    delay: Math.min(i * 0.04, 0.24),
                  }}
                >
                  <ProviderCard provider={p} category={category} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col lg:flex-row lg:gap-4 lg:h-[600px]"
            >
              {/* Map — 50vh on mobile, fills container on desktop */}
              <div className="h-[50vh] lg:h-full lg:flex-1 lg:min-h-0 rounded-xl overflow-hidden">
                <ProviderMap
                  providers={providers}
                  category={category}
                  onSelectProvider={setSelectedId}
                  selectedId={selectedId}
                />
              </div>
              {/* Card list — normal flow on mobile, scrollable panel on desktop */}
              <div className="flex flex-col gap-3 mt-3 lg:mt-0 lg:w-72 lg:overflow-y-auto lg:pr-1">
                {providers
                  .sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : 0))
                  .map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`cursor-pointer rounded-2xl transition-shadow ${
                        selectedId === p.id
                          ? 'ring-2 ring-[var(--pl-teal)] shadow-md'
                          : ''
                      }`}
                    >
                      <ProviderCard provider={p} category={category} />
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
