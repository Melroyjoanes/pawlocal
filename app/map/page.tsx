'use client'

import { useEffect, useState, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, JUHU_CENTER, getCategoryBySlug } from '@/lib/categories'
import type { ProviderWithPhotos } from '@/lib/supabase/types'

const MAP_CATEGORIES = CATEGORIES

export default function MapPage() {
  const [providers, setProviders] = useState<ProviderWithPhotos[]>([])
  const [loading, setLoading] = useState(true)
  // Single-category mode — start with first category selected
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set([MAP_CATEGORIES[0]?.slug ?? 'dog-walking'])
  )
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithPhotos | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('providers')
      .select('*, provider_photos(*)')
      .eq('status', 'approved')
      .order('is_verified', { ascending: false })
      .then(({ data }) => {
        setProviders((data as unknown as ProviderWithPhotos[]) ?? [])
        setLoading(false)
      })
  }, [])

  // Single-select: clicking a chip shows ONLY that category
  function toggleCategory(slug: string) {
    setActiveCategories(new Set([slug]))
  }

  const visibleProviders = providers.filter((p) => {
    // Show if any of provider's categories is active
    const slugs: string[] = p.category_slugs?.length
      ? p.category_slugs
      : [p.category_slug]
    return slugs.some((s) => activeCategories.has(s))
  })

  const handleMarkerClick = useCallback((provider: ProviderWithPhotos) => {
    setSelectedProvider((prev) => (prev?.id === provider.id ? null : provider))
  }, [])

  const selectedCategory = selectedProvider
    ? getCategoryBySlug(
        selectedProvider.category_slugs?.[0] ?? selectedProvider.category_slug
      )
    : null

  const counts = MAP_CATEGORIES.map((c) => ({
    ...c,
    count: providers.filter((p) => {
      const slugs = p.category_slugs?.length ? p.category_slugs : [p.category_slug]
      return slugs.includes(c.slug)
    }).length,
  }))

  return (
    // Break out of layout padding — full viewport below header
    <div className="-mx-4 -mt-8 -mb-8" style={{ height: 'calc(100svh - 3.5rem)' }}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <div className="relative w-full h-full">

          {/* ── Category filter chips — overlaid top-left ─────────────── */}
          <div className="absolute top-3 left-3 right-3 z-10 flex gap-2 flex-wrap pointer-events-none">
            {counts.map((c) => {
              const active = activeCategories.has(c.slug)
              return (
                <button
                  key={c.slug}
                  onClick={() => toggleCategory(c.slug)}
                  className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all ${
                    active
                      ? 'text-white shadow-lg scale-[1.02]'
                      : 'bg-white/80 backdrop-blur-sm text-muted-foreground border border-white/60 opacity-70'
                  }`}
                  style={active ? { backgroundColor: c.color } : {}}
                >
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                  {c.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full leading-none ${
                        active ? 'bg-white/25' : 'bg-muted'
                      }`}
                    >
                      {c.count}
                    </span>
                  )}
                </button>
              )
            })}
            {loading && (
              <span className="pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/80 backdrop-blur-sm shadow-md text-muted-foreground">
                Loading…
              </span>
            )}
          </div>

          {/* ── Map ──────────────────────────────────────────────────────── */}
          <Map
            defaultCenter={JUHU_CENTER}
            defaultZoom={13}
            mapId="2e772a5d74f171be6814c0ca"
            className="w-full h-full"
            gestureHandling="greedy"
            onClick={() => setSelectedProvider(null)}
          >
            {visibleProviders.map((provider) => {
              const slug = provider.category_slugs?.[0] ?? provider.category_slug
              const cat = getCategoryBySlug(slug)
              const color = cat?.color ?? '#6B7280'
              const isSelected = selectedProvider?.id === provider.id

              return (
                <AdvancedMarker
                  key={provider.id}
                  position={{ lat: provider.lat, lng: provider.lng }}
                  onClick={() => handleMarkerClick(provider)}
                  title={provider.name}
                  zIndex={isSelected ? 100 : 1}
                >
                  <Pin
                    background={isSelected ? '#111827' : color}
                    borderColor={isSelected ? '#111827' : color}
                    glyphColor="#ffffff"
                    scale={isSelected ? 1.5 : 1}
                  />
                </AdvancedMarker>
              )
            })}

            {/* InfoWindow on selected marker */}
            {selectedProvider && (
              <InfoWindow
                position={{ lat: selectedProvider.lat, lng: selectedProvider.lng }}
                onCloseClick={() => setSelectedProvider(null)}
                pixelOffset={[0, -44]}
              >
                <ProviderPopup
                  provider={selectedProvider}
                  categoryColor={selectedCategory?.color ?? '#6B7280'}
                  categoryIcon={selectedCategory?.icon ?? '🐾'}
                  categoryName={selectedCategory?.name ?? ''}
                />
              </InfoWindow>
            )}
          </Map>

          {/* ── Provider count badge — bottom right ──────────────────────── */}
          <div className="absolute bottom-6 right-3 z-10 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-md border border-white/60">
            {loading ? '…' : `${visibleProviders.length} shown`}
          </div>
        </div>
      </APIProvider>
    </div>
  )
}

// ── Popup card inside InfoWindow ──────────────────────────────────────────────
function ProviderPopup({
  provider,
  categoryColor,
  categoryIcon,
  categoryName,
}: {
  provider: ProviderWithPhotos
  categoryColor: string
  categoryIcon: string
  categoryName: string
}) {
  const primaryPhoto =
    provider.provider_photos?.find((p) => p.is_primary) ?? provider.provider_photos?.[0]

  return (
    <div className="flex gap-3 min-w-[220px] max-w-[280px] font-sans">
      {/* Photo or icon */}
      <div
        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl"
        style={{ backgroundColor: categoryColor + '18' }}
      >
        {primaryPhoto ? (
          <img src={primaryPhoto.url} alt={provider.name} className="w-full h-full object-cover" />
        ) : (
          <span>{categoryIcon}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Name + verified */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-semibold text-sm text-gray-900 leading-tight truncate">
            {provider.name}
          </span>
          {provider.is_verified && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none bg-amber-100 text-amber-700 flex-shrink-0">
              ✓
            </span>
          )}
        </div>

        {/* Category chip */}
        <span
          className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 leading-none"
          style={{ backgroundColor: categoryColor + '20', color: categoryColor }}
        >
          {categoryIcon} {categoryName}
        </span>

        {/* Price */}
        {provider.price_min && (
          <p className="text-xs text-gray-600 mt-1">
            ₹{provider.price_min}
            {provider.price_max && provider.price_max !== provider.price_min
              ? `–${provider.price_max}`
              : ''}{' '}
            <span className="text-gray-400">{provider.price_unit}</span>
          </p>
        )}

        {/* Address */}
        <p className="text-[11px] text-gray-500 mt-0.5 truncate">📍 {provider.address}</p>

        {/* CTAs */}
        <div className="flex gap-2 mt-2">
          <a
            href={`/api/provider/whatsapp-redirect/${provider.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-white px-2.5 py-1.5 rounded-full bg-green-600 hover:bg-green-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            💬 WhatsApp
          </a>
          <a
            href={`/provider/${provider.id}`}
            className="flex items-center gap-1 text-[11px] font-medium border border-gray-200 text-gray-700 px-2.5 py-1.5 rounded-full hover:bg-gray-50 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            View →
          </a>
        </div>
      </div>
    </div>
  )
}
