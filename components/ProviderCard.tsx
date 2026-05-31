import Link from 'next/link'
import type { ProviderWithPhotos } from '@/lib/supabase/types'
import type { CategoryConfig } from '@/lib/categories'

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
  const whatsappUrl = `https://wa.me/91${provider.whatsapp.replace(/\D/g, '')}`

  return (
    <Link
      href={`/provider/${provider.id}`}
      className="group flex gap-4 bg-white p-4 rounded-2xl border border-border hover:border-[var(--pl-teal)] hover:shadow-md transition-all"
    >
      {/* Photo */}
      <div className="w-[88px] h-[88px] rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
        {primaryPhoto ? (
          <img
            src={primaryPhoto.url}
            alt={provider.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ backgroundColor: category.color + '18' }}
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
              <span className="font-semibold text-foreground leading-snug">{provider.name}</span>
              {provider.is_verified && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--pl-amber-light)',
                    color: 'var(--pl-amber)',
                  }}
                >
                  ✓ Verified
                </span>
              )}
            </div>
            {provider.business_name && provider.business_name !== provider.name && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{provider.business_name}</p>
            )}
          </div>

          {/* Price — top right, first thing eye goes to after name */}
          {provider.price_min && (
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-foreground leading-none">
                ₹{provider.price_min}
                {provider.price_max && provider.price_max !== provider.price_min
                  ? `–${provider.price_max}`
                  : ''}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{provider.price_unit}</p>
            </div>
          )}
        </div>

        {/* Hours + location — scan-critical row */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
          <span>
            {formatHour(provider.hours_from)} – {formatHour(provider.hours_to)}
          </span>
          <span className="opacity-40">·</span>
          <span className="truncate">📍 {provider.address}</span>
        </div>

        {/* Bio */}
        {provider.bio && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{provider.bio}</p>
        )}

        {/* CTAs */}
        <div
          className="flex items-center gap-2 mt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-full transition-colors bg-green-600 hover:bg-green-700"
          >
            💬 WhatsApp
          </a>
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              className="text-xs font-medium border border-border text-foreground px-3 py-1.5 rounded-full transition-colors hover:bg-muted"
            >
              📞 Call
            </a>
          )}
          {provider.source === 'google_places' && !provider.is_verified && (
            <span className="text-[10px] text-muted-foreground ml-auto opacity-60">
              via Google
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
