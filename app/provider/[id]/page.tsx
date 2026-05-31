import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCategoryBySlug } from '@/lib/categories'
import type { ProviderWithPhotos } from '@/lib/supabase/types'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('providers')
    .select('name, bio, category_slug')
    .eq('id', id)
    .single()
  if (!data) return { title: 'Provider not found | PawLocal' }
  return {
    title: `${data.name} | PawLocal`,
    description: data.bio ?? `${data.name} offers ${data.category_slug.replace(/-/g, ' ')} services in Juhu, Mumbai.`,
  }
}

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('providers')
    .select('*, provider_photos(*)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (!data) notFound()

  const provider = data as unknown as ProviderWithPhotos
  const category = getCategoryBySlug(provider.category_slug)
  if (!category) notFound()

  const primaryPhoto = provider.provider_photos.find((p) => p.is_primary) ?? provider.provider_photos[0]
  const galleryPhotos = provider.provider_photos
    .filter((p) => !p.is_primary)
    .sort((a, b) => a.sort_order - b.sort_order)

  const whatsappUrl = `https://wa.me/91${provider.whatsapp.replace(/\D/g, '')}`

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <a href={`/${provider.category_slug}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-6">
        ← Back to {category.name}
      </a>

      {/* Profile header */}
      <div className="flex gap-5 items-start mb-6">
        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
          {primaryPhoto ? (
            <img src={primaryPhoto.url} alt={provider.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              {category.icon}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{provider.name}</h1>
          {provider.business_name && (
            <p className="text-gray-400 text-sm">{provider.business_name}</p>
          )}
          <span
            className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded-full"
            style={{ backgroundColor: category.color + '20', color: category.color }}
          >
            {category.icon} {category.name}
          </span>
        </div>
      </div>

      {/* Bio */}
      {provider.bio && (
        <p className="text-gray-600 leading-relaxed mb-6">{provider.bio}</p>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {(provider.price_min || provider.price_max) && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Pricing</p>
            <p className="font-semibold text-gray-900">
              ₹{provider.price_min}
              {provider.price_max && provider.price_max !== provider.price_min
                ? `–₹${provider.price_max}`
                : ''}
              <span className="text-xs font-normal text-gray-400 ml-1">{provider.price_unit}</span>
            </p>
          </div>
        )}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Hours</p>
          <p className="font-semibold text-gray-900">
            {provider.hours_from} – {provider.hours_to}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {provider.working_days.join(', ')}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 col-span-2">
          <p className="text-xs text-gray-400 mb-1">Location</p>
          <p className="font-medium text-gray-900">{provider.address}</p>
        </div>
      </div>

      {/* Gallery */}
      {galleryPhotos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">Photos</h2>
          <div className="grid grid-cols-3 gap-2">
            {galleryPhotos.map((photo) => (
              <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex gap-3 sticky bottom-4">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-semibold text-center hover:bg-green-600 transition text-lg"
        >
          💬 WhatsApp
        </a>
        {provider.phone && (
          <a
            href={`tel:${provider.phone}`}
            className="flex-1 border-2 border-gray-200 text-gray-700 py-4 rounded-2xl font-semibold text-center hover:bg-gray-50 transition text-lg"
          >
            📞 Call
          </a>
        )}
      </div>
    </div>
  )
}
