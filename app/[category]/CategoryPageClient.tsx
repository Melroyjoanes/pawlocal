'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getCategoryBySlug } from '@/lib/categories'
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
  const slug = params.category as string
  const category = getCategoryBySlug(slug)

  // Resolve neighbourhood: URL param → localStorage → default 'Juhu'
  const [neighbourhood, setNeighbourhood] = useState<string>('Juhu')
  useEffect(() => {
    const urlArea = searchParams.get('area')
    const stored = typeof window !== 'undefined' ? localStorage.getItem('pawlocal_area') : null
    setNeighbourhood(urlArea ?? stored ?? 'Juhu')
  }, [searchParams])

  const [providers, setProviders] = useState<ProviderWithPhotos[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [emergencyOnly, setEmergencyOnly] = useState(false)

  useEffect(() => {
    if (!category) return
    setLoading(true)
    const supabase = createClient()
    // Filter by neighbourhood; fall back gracefully if column doesn't exist
    supabase
      .from('providers')
      .select('*, provider_photos(*)')
      .or(`category_slug.eq.${slug},category_slugs.cs.{${slug}}`)
      .eq('status', 'approved')
      .eq('neighbourhood', neighbourhood)
      .order('is_verified', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          // neighbourhood column not yet added — show all
          supabase
            .from('providers')
            .select('*, provider_photos(*)')
            .or(`category_slug.eq.${slug},category_slugs.cs.{${slug}}`)
            .eq('status', 'approved')
            .order('is_verified', { ascending: false })
            .order('created_at', { ascending: false })
            .then(({ data: all }) => {
              setProviders((all as unknown as ProviderWithPhotos[]) ?? [])
              setLoading(false)
            })
        } else {
          setProviders((data as unknown as ProviderWithPhotos[]) ?? [])
          setLoading(false)
        }
      })
  }, [slug, category, neighbourhood])

  if (!category) {
    return <div className="py-20 text-center text-muted-foreground">Category not found.</div>
  }

  const displayedProviders = emergencyOnly
    ? providers.filter((p) => (p as ProviderWithPhotos & { is_emergency?: boolean }).is_emergency)
    : providers

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-7">
        <div
          className="w-14 h-14 rounded-[18px] flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            background: `linear-gradient(145deg, ${category.color}18 0%, ${category.color}30 100%)`,
            boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2.5px 0 ${category.color}28, 0 8px 20px ${category.color}22`,
            border: `1px solid ${category.color}25`,
          }}
        >
          {category.icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">{category.name}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{category.tagline} · {neighbourhood}, Mumbai</p>
        </div>
        {!loading && (
          <span
            className="ml-auto text-xs font-bold px-3 py-1.5 clay-badge-amber"
            style={{ color: '#78350F' }}
          >
            {displayedProviders.length} {displayedProviders.length === 1 ? 'result' : 'results'}
          </span>
        )}
      </div>

      {/* Emergency filter — only show for vet category */}
      {slug === 'vet' && (
        <button
          onClick={() => setEmergencyOnly((v) => !v)}
          className="flex items-center gap-1.5 mb-4 px-4 py-2 text-sm font-bold transition-all"
          style={emergencyOnly ? {
            background: 'linear-gradient(160deg, #FCA5A5 0%, #EF4444 100%)',
            color: '#fff',
            borderRadius: 9999,
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -3px 0 rgba(127,29,29,0.35), 0 8px 20px rgba(239,68,68,0.38)',
            border: '1px solid rgba(252,165,165,0.3)',
          } : {
            background: 'linear-gradient(160deg, #FFF1F2 0%, #FECDD3 100%)',
            color: '#BE123C',
            borderRadius: 9999,
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2.5px 0 rgba(159,18,57,0.15), 0 6px 16px rgba(254,205,211,0.55)',
            border: '1px solid rgba(254,205,211,0.8)',
          }}
        >
          🚨 24hr / Emergency only
        </button>
      )}

      {/* View toggle — clay segmented control */}
      <div
        className="flex gap-1 mb-6 p-1 w-fit"
        style={{
          background: 'linear-gradient(160deg, #FEF3C7 0%, #FDE68A 100%)',
          boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -2px 0 rgba(161,98,7,0.15), 0 4px 12px rgba(253,230,138,0.5)',
          border: '1px solid rgba(253,230,138,0.7)',
          borderRadius: 16,
        }}
      >
        {(['list', 'map'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="relative px-5 py-1.5 text-sm font-semibold transition-all"
            style={{ borderRadius: 12, color: view === v ? '#78350F' : '#92400E' }}
          >
            {view === v && (
              <motion.span
                layoutId="view-pill"
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf5 100%)',
                  borderRadius: 12,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -2px 0 rgba(0,0,0,0.07), 0 4px 10px rgba(0,0,0,0.09)',
                }}
                transition={{ duration: 0.2, ease: EASE_OUT_QUART }}
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
      ) : displayedProviders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
          className="py-10 flex flex-col items-center"
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
              className="flex flex-col gap-3"
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
