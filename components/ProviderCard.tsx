import Link from 'next/link'
import type { ProviderWithPhotos } from '@/lib/supabase/types'
import type { CategoryConfig } from '@/lib/categories'

interface Props {
  provider: ProviderWithPhotos
  category: CategoryConfig
}

export default function ProviderCard({ provider, category }: Props) {
  const primaryPhoto = provider.provider_photos.find((p) => p.is_primary) ?? provider.provider_photos[0]
  const whatsappUrl = `https://wa.me/91${provider.whatsapp.replace(/\D/g, '')}`

  return (
    <Link
      href={`/provider/${provider.id}`}
      className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition bg-white"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
        {primaryPhoto ? (
          <img src={primaryPhoto.url} alt={provider.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {category.icon}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 truncate">{provider.name}</p>
            {provider.business_name && (
              <p className="text-xs text-gray-400 truncate">{provider.business_name}</p>
            )}
          </div>
          {provider.price_min && (
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              ₹{provider.price_min}
              {provider.price_max && provider.price_max !== provider.price_min
                ? `–${provider.price_max}`
                : ''}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1 truncate">{provider.address}</p>
        {provider.bio && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{provider.bio}</p>
        )}
        <div className="flex gap-2 mt-3" onClick={(e) => e.preventDefault()}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-full font-medium hover:bg-green-600 transition"
          >
            WhatsApp
          </a>
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              className="text-xs border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-medium hover:bg-gray-50 transition"
            >
              Call
            </a>
          )}
        </div>
      </div>
    </Link>
  )
}
