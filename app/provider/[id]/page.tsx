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

  const primaryPhoto =
    provider.provider_photos.find((p) => p.is_primary) ?? provider.provider_photos[0]
  const galleryPhotos = provider.provider_photos
    .filter((p) => !p.is_primary)
    .sort((a, b) => a.sort_order - b.sort_order)

  const whatsappUrl = `https://wa.me/91${provider.whatsapp.replace(/\D/g, '')}`
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(
    `🐾 Check out ${provider.name} for ${category.name} near Juhu!\n\nhttps://pawlocal-ashen.vercel.app/provider/${provider.id}`
  )}`

  function formatHour(t: string) {
    const [h, m] = t.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'pm' : 'am'
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return m === '00' ? `${display}${ampm}` : `${display}:${m}${ampm}`
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <a
        href={`/${provider.category_slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-7"
      >
        ← {category.name}
      </a>

      {/* Profile header */}
      <div className="flex gap-5 items-start mb-7">
        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-stone-100">
          {primaryPhoto ? (
            <img
              src={primaryPhoto.url}
              alt={provider.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-4xl"
              style={{ backgroundColor: category.color + '18' }}
            >
              {category.icon}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display text-foreground leading-tight">
            {provider.name}
          </h1>
          {provider.business_name && provider.business_name !== provider.name && (
            <p className="text-sm text-muted-foreground mt-0.5">{provider.business_name}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span
              className="inline-block text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: category.color + '18', color: category.color }}
            >
              {category.icon} {category.name}
            </span>
            {provider.is_verified && (
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                style={{
                  backgroundColor: 'var(--pl-amber-light)',
                  borderColor: 'oklch(0.88 0.12 75)',
                  color: 'var(--pl-amber)',
                }}
              >
                ✓ Verified by PawLocal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {provider.bio && (
        <p className="text-muted-foreground leading-relaxed mb-7">{provider.bio}</p>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mb-7">
        {(provider.price_min || provider.price_max) && (
          <div className="bg-white border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1.5">Pricing</p>
            <p className="font-semibold text-foreground">
              ₹{provider.price_min}
              {provider.price_max && provider.price_max !== provider.price_min
                ? `–₹${provider.price_max}`
                : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{provider.price_unit}</p>
          </div>
        )}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1.5">Hours</p>
          <p className="font-semibold text-foreground">
            {formatHour(provider.hours_from)} – {formatHour(provider.hours_to)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {provider.working_days.slice(0, 3).join(', ')}
            {provider.working_days.length > 3 ? ` +${provider.working_days.length - 3} more` : ''}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 col-span-2">
          <p className="text-xs text-muted-foreground mb-1.5">Location</p>
          <p className="font-medium text-foreground">{provider.address}</p>
        </div>
      </div>

      {/* Gallery */}
      {galleryPhotos.length > 0 && (
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Photos
          </p>
          <div className="grid grid-cols-3 gap-2">
            {galleryPhotos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square rounded-xl overflow-hidden bg-stone-100"
              >
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky CTA — clears iOS home indicator via safe-area-inset */}
      <div
        className="sticky bottom-0 -mx-4 px-4 pt-3 bg-background/95 backdrop-blur-sm flex flex-col gap-2"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-green-600 active:bg-green-800 hover:bg-green-700 text-white py-4 rounded-2xl font-semibold text-center transition-colors flex items-center justify-center gap-2 min-h-[52px]"
          >
            💬 WhatsApp
          </a>
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              className="flex-1 bg-white border border-border text-foreground py-4 rounded-2xl font-semibold text-center hover:bg-muted active:bg-muted transition-colors flex items-center justify-center gap-2 min-h-[52px]"
            >
              📞 Call
            </a>
          )}
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-green-600 transition-colors py-1"
        >
          ↗ Share on WhatsApp
        </a>
      </div>
    </div>
  )
}
