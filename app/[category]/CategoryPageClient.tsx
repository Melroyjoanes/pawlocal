'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getCategoryBySlug, CATEGORIES } from '@/lib/categories'
import type { ProviderWithPhotos } from '@/lib/supabase/types'
import ProviderCard from '@/components/ProviderCard'
import dynamic from 'next/dynamic'

const ProviderMap = dynamic(() => import('@/components/ProviderMap'), { ssr: false })

// Skeleton card shown while loading — clay style
function ProviderCardSkeleton() {
  return (
    <div
      className="flex gap-4 p-4 animate-pulse"
      style={{
        background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -3px 0 rgba(0,0,0,0.06), 0 8px 24px rgba(15,45,50,0.08)',
        border: '1px solid rgba(226,220,200,0.7)',
        borderRadius: 24,
      }}
    >
      <div className="w-[88px] h-[88px] flex-shrink-0 rounded-[20px] bg-amber-100/60" />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="h-4 bg-amber-100/70 rounded-full w-2/5" />
          <div className="h-8 w-16 bg-amber-100/60 rounded-xl" />
        </div>
        <div className="h-3 bg-stone-200/60 rounded-full w-1/3 mt-2" />
        <div className="h-3 bg-stone-200/60 rounded-full w-3/5 mt-1.5" />
        <div className="flex gap-2 mt-3">
          <div className="h-7 bg-green-100/70 rounded-full w-24" />
          <div className="h-7 bg-stone-100/70 rounded-full w-16" />
        </div>
      </div>
    </div>
  )
}

const EASE_OUT_QUART = [0.25, 0.46, 0.45, 0.94] as const

export default function CategoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = params.category as string
  const category = getCategoryBySlug(slug)

  // Neighbourhood is Juhu-only in phase 1
  const neighbourhood = 'Juhu'
  // suppress unused warning until locality filtering is implemented
  void searchParams

  const [providers, setProviders] = useState<ProviderWithPhotos[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [emergencyOnly, setEmergencyOnly] = useState(false)

  useEffect(() => {
    if (!category) return
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('providers')
      .select('*, provider_photos(*)')
      .or(`category_slug.eq.${slug},category_slugs.cs.{${slug}}`)
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

  const displayedProviders = emergencyOnly
    ? providers.filter((p) => (p as ProviderWithPhotos & { is_emergency?: boolean }).is_emergency)
    : providers

  // Visible categories (exclude insurance from the quick-switch bar)
  const BROWSE_CATS = CATEGORIES.filter(c => c.slug !== 'insurance')

  return (
    <div className="-mx-4 sm:mx-0">

      {/* ── Browse header ── */}
      <div className="px-4 sm:px-0 pt-2 pb-5">

        {/* Row 1: eyebrow + map button */}
        <div className="flex items-start justify-between mb-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--pl-teal)' }}>
            Browse
          </p>
          <button
            onClick={() => setView(v => v === 'map' ? 'list' : 'map')}
            aria-label={view === 'map' ? 'Switch to list' : 'Show on map'}
            className="flex items-center justify-center w-10 h-10 rounded-2xl transition-all active:scale-95"
            style={view === 'map' ? {
              background: 'linear-gradient(160deg, oklch(0.48 0.17 196) 0%, oklch(0.42 0.15 196) 100%)',
              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.18), inset 0 -3px 0 oklch(0.36 0.14 198), 0 8px 20px oklch(0.48 0.17 196 / 0.4)',
              color: '#fff',
            } : {
              background: 'linear-gradient(160deg, #ffffff 0%, #fffdf5 100%)',
              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.95), inset 0 -2.5px 0 rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.07)',
              border: '1px solid rgba(226,220,200,0.8)',
              color: '#374151',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
          </button>
        </div>

        {/* Row 2: category heading */}
        <h1 className="font-display text-[2rem] leading-[1.1] text-slate-900 mb-4">
          {category.name}
        </h1>

        {/* Row 3: category switcher pills */}
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {BROWSE_CATS.map(cat => {
            const active = cat.slug === slug
            return (
              <motion.button
                key={cat.slug}
                onClick={() => router.push(`/${cat.slug}`)}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all"
                style={active ? {
                  background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
                  color: '#fff',
                  borderRadius: 9999,
                  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.18), inset 0 -3px 0 oklch(0.36 0.14 198), 0 8px 20px oklch(0.48 0.17 196 / 0.35)',
                } : {
                  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                  color: '#374151',
                  borderRadius: 9999,
                  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(226,220,200,0.8)',
                }}
              >
                <span className="text-base leading-none">{cat.icon}</span>
                <span>{cat.name}</span>
              </motion.button>
            )
          })}
        </div>

        {/* Row 4: provider count */}
        <div className="mt-4 flex items-center justify-between">
          {!loading ? (
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{displayedProviders.length}</span>
              {' '}{displayedProviders.length === 1 ? 'provider' : 'providers'} near {neighbourhood}
            </p>
          ) : (
            <div className="h-4 w-36 rounded-full bg-amber-100/70 animate-pulse" />
          )}

          {/* Emergency toggle — vet only */}
          {slug === 'vet' && (
            <button
              onClick={() => setEmergencyOnly(v => !v)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold transition-all"
              style={emergencyOnly ? {
                background: 'linear-gradient(160deg, #FCA5A5 0%, #EF4444 100%)',
                color: '#fff',
                borderRadius: 9999,
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -3px 0 rgba(127,29,29,0.35), 0 6px 16px rgba(239,68,68,0.35)',
              } : {
                background: 'linear-gradient(160deg, #FFF1F2 0%, #FECDD3 100%)',
                color: '#BE123C',
                borderRadius: 9999,
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(159,18,57,0.12), 0 4px 12px rgba(254,205,211,0.5)',
                border: '1px solid rgba(254,205,211,0.8)',
              }}
            >
              🚨 24hr only
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/60 mx-4 sm:mx-0 mb-5" />

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-3 px-4 sm:px-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProviderCardSkeleton key={i} />
          ))}
        </div>
      ) : displayedProviders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
          className="py-10 flex flex-col items-center px-4 sm:px-0"
        >
          <p className="text-3xl mb-3">🔍</p>
          <p className="font-semibold text-slate-800 mb-1">
            {emergencyOnly ? 'No 24hr / emergency vets listed yet.' : `No ${category.name.toLowerCase()}s listed in ${neighbourhood} yet.`}
          </p>
          <p className="text-sm text-slate-500 mb-6 text-center max-w-xs">
            {emergencyOnly
              ? 'Try removing the emergency filter to see all vets.'
              : 'Post a free broadcast — providers nearby will reach out to you directly.'}
          </p>
          {!emergencyOnly && (
            <a
              href="/broadcast"
              className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm transition-all"
              style={{
                background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
                color: '#451A03',
                boxShadow: '0 4px 0px rgba(120,53,15,0.22)',
              }}
            >
              📣 Post a request
            </a>
          )}
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
              className="flex flex-col gap-3 px-4 sm:px-0"
            >
              {displayedProviders.map((p, i) => (
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

              {/* Broadcast CTA — always shown after the list */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT_QUART, delay: 0.3 }}
                className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900 mb-1">
                    📣 Can't find the right {category.name.toLowerCase()}?
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Post a free request — verified providers near you reply on WhatsApp. No booking fee, no middleman.
                  </p>
                </div>
                <a
                  href="/broadcast"
                  className="flex-shrink-0 flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
                    color: '#451A03',
                    boxShadow: '0 4px 0px rgba(120,53,15,0.2)',
                  }}
                >
                  Post a request →
                </a>
              </motion.div>
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
                  providers={displayedProviders}
                  category={category}
                  onSelectProvider={setSelectedId}
                  selectedId={selectedId}
                />
              </div>
              {/* Card list — normal flow on mobile, scrollable panel on desktop */}
              <div className="flex flex-col gap-3 mt-3 lg:mt-0 lg:w-72 lg:overflow-y-auto lg:pr-1">
                {displayedProviders
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
