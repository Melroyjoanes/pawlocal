'use client'

import Link from 'next/link'
import type { ProviderWithPhotos } from '@/lib/supabase/types'
import type { CategoryConfig } from '@/lib/categories'
import VerificationBadge from '@/components/VerificationBadge'

interface Props {
  provider: ProviderWithPhotos
  category: CategoryConfig
}

function formatHour(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return m === '00' ? `${display}${ampm}` : `${display}:${m}${ampm}`
}

export default function ProviderCard({ provider, category }: Props) {
  const primaryPhoto =
    provider.provider_photos.find((p) => p.is_primary) ?? provider.provider_photos[0]

  // Use per-service price if available, else fall back to global price_min/max
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svcPrices = (provider as any).service_prices as Record<string, { min?: number; max?: number; unit?: string }> | null
  const svcPrice = svcPrices?.[category.slug]
  const displayMin  = svcPrice?.min  ?? provider.price_min
  const displayMax  = svcPrice?.max  ?? provider.price_max
  const displayUnit = svcPrice?.unit ?? provider.price_unit

  return (
    // Native <Link> → Next.js prefetches on viewport intersection → navigation feels instant
    <Link
      href={`/provider/${provider.id}`}
      className="group flex gap-4 p-4 clay-card cursor-pointer active:scale-[0.985] transition-transform duration-100"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Photo */}
      <div
        className="w-[88px] h-[88px] flex-shrink-0 overflow-hidden"
        style={{
          borderRadius: 20,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 12px rgba(0,0,0,0.10)',
          background: category.color + '12',
        }}
      >
        {primaryPhoto ? (
          <img
            src={primaryPhoto.url}
            alt={provider.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            style={{ borderRadius: 20 }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: `linear-gradient(135deg, ${category.color}14 0%, ${category.color}28 100%)` }}
          >
            {category.icon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-900 leading-snug">{provider.name}</span>
              <VerificationBadge tier={(provider.verification_tier as 'contacted' | 'verified' | 'certified') ?? 'contacted'} />
              {(provider as any).intro_video_url && (
                <span
                  className="inline-flex items-center text-[10px] font-bold px-2 py-0.5"
                  style={{
                    background: 'linear-gradient(160deg, #FFF0F5 0%, #FECDD3 100%)',
                    color: '#9F1239',
                    borderRadius: 100,
                    border: '1px solid rgba(254,205,211,0.6)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 6px rgba(254,205,211,0.45)',
                  }}
                >
                  📹 Video
                </span>
              )}
              {provider.is_available === false && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 flex-shrink-0"
                  style={{
                    background: 'linear-gradient(160deg, #F8FAFC 0%, #F1F5F9 100%)',
                    color: '#94A3B8',
                    borderRadius: 100,
                    border: '1px solid rgba(226,232,240,0.8)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  Currently unavailable
                </span>
              )}
            </div>
            {provider.business_name && provider.business_name !== provider.name && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{provider.business_name}</p>
            )}
          </div>

          {/* Price */}
          {displayMin && (
            <div
              className="text-right shrink-0 pl-1 px-2.5 py-1"
              style={{
                background: 'linear-gradient(160deg, #FEF9C3 0%, #FDE68A 100%)',
                borderRadius: 12,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(161,98,7,0.15), 0 3px 8px rgba(253,230,138,0.5)',
                border: '1px solid rgba(253,230,138,0.6)',
              }}
            >
              <p className="text-sm font-bold text-amber-900 leading-none">
                ₹{displayMin}
                {displayMax && displayMax !== displayMin ? `–${displayMax}` : ''}
              </p>
              <p className="text-[9px] font-semibold text-amber-700 mt-0.5 opacity-80">{displayUnit}</p>
            </div>
          )}
        </div>

        {/* Hours + location */}
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 min-w-0">
          <span className="shrink-0 font-medium text-slate-500">
            {formatHour(provider.hours_from)} – {formatHour(provider.hours_to)}
          </span>
          <span className="opacity-40 shrink-0">·</span>
          <span className="truncate min-w-0">📍 {provider.address}</span>
        </div>

        {/* Bio */}
        {provider.bio && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">{provider.bio}</p>
        )}

        {/* CTAs */}
        <div className="flex items-center gap-2 mt-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-1.5 clay-btn-wa pointer-events-none">
            💬 WhatsApp
          </span>
          {provider.phone && (
            <span className="text-xs font-semibold px-3.5 py-1.5 clay-btn-ghost pointer-events-none">
              📞 Call
            </span>
          )}
          <span className="ml-auto text-xs font-semibold flex items-center gap-0.5 shrink-0" style={{ color: 'var(--pl-teal)' }}>
            View →
          </span>
        </div>
      </div>
    </Link>
  )
}
