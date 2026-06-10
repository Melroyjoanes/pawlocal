import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCategoryBySlug } from '@/lib/categories'
import type { ProviderWithPhotos, Review, TrainerMetadata } from '@/lib/supabase/types'
import { Stars } from '@/components/StarRating'
import { TrackView } from '@/components/ProviderTracker'
import VerificationBadge from '@/components/VerificationBadge'
import TierExplainer from '@/components/TierExplainer'
import ProviderCTABar from '@/components/ProviderCTABar'

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

  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('providers')
    .select('*, provider_photos(*)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (!data) notFound()

  const provider = data as unknown as ProviderWithPhotos
  const isOwner = !!user?.email && user.email === (provider as unknown as { email?: string }).email
  const category = getCategoryBySlug(provider.category_slug)
  if (!category) notFound()

  // Approved reviews only
  const { data: reviewsData } = await supabase
    .from('reviews')
    .select('*')
    .eq('provider_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  const reviews = (reviewsData ?? []) as unknown as Review[]
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  // Trust signals
  const { count: jobsCompleted } = await supabase
    .from('booking_requests')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', id)
    .eq('status', 'completed')

  const { count: walksCompleted } = await (supabase as any)
    .from('walk_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', provider.id)
    .eq('status', 'completed')

  const totalJobs = (jobsCompleted ?? 0) + (walksCompleted ?? 0)
  const memberSince = new Date(provider.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const primaryPhoto =
    provider.provider_photos.find((p) => p.is_primary) ?? provider.provider_photos[0]
  const galleryPhotos = provider.provider_photos
    .filter((p) => !p.is_primary)
    .sort((a, b) => a.sort_order - b.sort_order)

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(
    `🐾 Check out ${provider.name} for ${category.name} near Juhu!\n\nhttps://pupstep.in/provider/${provider.id}`
  )}`

  function formatHour(t: string) {
    const [h, m] = t.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'pm' : 'am'
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return m === '00' ? `${display}${ampm}` : `${display}:${m}${ampm}`
  }

  function getVideoEmbed(url: string): { type: 'youtube' | 'loom' | 'instagram'; embedUrl?: string } {
    if (url.includes('youtu.be') || url.includes('youtube.com')) {
      const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      return { type: 'youtube', embedUrl: match ? `https://www.youtube.com/embed/${match[1]}` : undefined }
    }
    if (url.includes('loom.com')) {
      return { type: 'loom', embedUrl: url.replace('/share/', '/embed/') }
    }
    if (url.includes('instagram.com')) {
      return { type: 'instagram' }
    }
    return { type: 'youtube' }
  }

  const p = provider as unknown as {
    intro_note?: string | null
    experience_years?: number | null
    languages?: string[] | null
    neighbourhood_tags?: string[] | null
    pet_types_handled?: string[] | null
    intro_video_url?: string | null
  }

  const petEmoji: Record<string, string> = {
    Dog: '🐕', Cat: '🐈', Bird: '🦜', Rabbit: '🐇', Hamster: '🐹', Fish: '🐠', Reptile: '🦎',
  }

  return (
    <div className="max-w-2xl mx-auto">
      <TrackView providerId={provider.id} />

      {/* ── Hero: full-bleed cover photo ─────────────────────────────── */}
      <div className="relative -mx-4 mb-0 h-64 sm:h-72 overflow-hidden bg-stone-100">
        {/* Back link — floats top-left */}
        <a
          href={`/${provider.category_slug}`}
          className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 text-sm font-medium text-white/90 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-black/50 transition-colors"
        >
          ← {category.name}
        </a>

        {/* Photo or colour fill */}
        {primaryPhoto ? (
          <img
            src={primaryPhoto.url}
            alt={provider.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-8xl"
            style={{ backgroundColor: category.color + '22' }}
          >
            {category.icon}
          </div>
        )}

        {/* Gradient overlay — name + badges at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
          <h1 className="text-2xl font-display text-white leading-tight mb-1">
            {provider.name}
          </h1>
          {provider.business_name && provider.business_name !== provider.name && (
            <p className="text-sm text-white/70 mb-2">{provider.business_name}</p>
          )}

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: category.color + '30', color: 'white', backdropFilter: 'blur(4px)' }}
            >
              {category.icon} {category.name}
            </span>
            <VerificationBadge
              tier={(provider.verification_tier as 'contacted' | 'verified' | 'certified') ?? 'contacted'}
              size="md"
            />
            {p.intro_video_url && (
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/80 text-white backdrop-blur-sm border border-pink-300/30">
                📹 Video
              </span>
            )}
            {reviews.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-white/90">
                <Stars rating={avgRating} count={reviews.length} size="sm" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Content body ─────────────────────────────────────────────── */}
      <div className="pt-5">

        {/* Availability note */}
        {provider.is_available === false && (
          <div className="mb-5 flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 w-fit">
              ⏸ Currently unavailable
            </span>
            {provider.availability_note && (
              <p className="text-xs text-muted-foreground pl-1">{provider.availability_note}</p>
            )}
          </div>
        )}

        {/* Trust chips row */}
        {(() => {
          const chips: string[] = []
          if (totalJobs > 0) chips.push(`${totalJobs} jobs done`)
          if (p.experience_years) chips.push(`${p.experience_years} yrs experience`)
          if (p.languages?.length) chips.push(p.languages.join(' · '))
          if (p.neighbourhood_tags?.length) chips.push(p.neighbourhood_tags.join(' · '))
          if (!chips.length) return (
            <p className="text-xs text-stone-400 mb-5">Member since {memberSince}</p>
          )
          return (
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {chips.map(chip => (
                <span key={chip} className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
                  {chip}
                </span>
              ))}
              <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-500">
                🗓 Since {memberSince}
              </span>
            </div>
          )
        })()}

        {/* Tier explainer */}
        {(provider.verification_tier === 'verified' || provider.verification_tier === 'certified') && (
          <div className="mb-5">
            <TierExplainer tier={provider.verification_tier as 'verified' | 'certified'} />
          </div>
        )}

        {/* Tagline / intro note */}
        {p.intro_note && (
          <blockquote className="mb-6 pl-4 border-l-2 border-teal-300 italic text-base text-stone-700 leading-snug">
            {p.intro_note}
          </blockquote>
        )}

        {/* Pet types */}
        {(p.pet_types_handled?.length ?? 0) > 0 && (
          <p className="text-sm text-stone-500 mb-5">
            Works with:{' '}
            {p.pet_types_handled!.map((pet, i) => (
              <span key={pet}>{i > 0 && ' · '}{petEmoji[pet] ?? ''} {pet}s</span>
            ))}
          </p>
        )}

        {/* Bio */}
        {provider.bio && (
          <p className="text-muted-foreground leading-relaxed mb-7">{provider.bio}</p>
        )}

        {/* Details grid */}
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
              {provider.working_days.length > 3 ? ` +${provider.working_days.length - 3}` : ''}
            </p>
          </div>
          <div className="bg-white border border-border rounded-xl p-4 col-span-2">
            <p className="text-xs text-muted-foreground mb-1.5">Location</p>
            <p className="font-medium text-foreground">{provider.address}</p>
          </div>
        </div>

        {/* Trainer details */}
        {provider.category_slug === 'dog-training' && provider.metadata && (() => {
          const t = provider.metadata as TrainerMetadata
          const hasAny = t.training_methods?.length || t.specialisations?.length || t.session_format || t.certifications || t.breeds
          if (!hasAny) return null
          return (
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Trainer details
              </p>
              <div className="flex flex-col gap-4">
                {t.training_methods && t.training_methods.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Training method</p>
                    <div className="flex flex-wrap gap-2">
                      {t.training_methods.map((m) => (
                        <span key={m} className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {t.specialisations && t.specialisations.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Specialises in</p>
                    <div className="flex flex-wrap gap-2">
                      {t.specialisations.map((s) => (
                        <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {t.session_format && (
                    <div className="bg-white border border-border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Session format</p>
                      <p className="text-sm font-medium text-foreground">{t.session_format}</p>
                    </div>
                  )}
                  {t.certifications && (
                    <div className="bg-white border border-border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Certifications</p>
                      <p className="text-sm font-medium text-foreground">{t.certifications}</p>
                    </div>
                  )}
                </div>
                {t.breeds && (
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1.5">Breeds experienced with</p>
                    <p className="text-sm text-foreground">{t.breeds}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Gallery */}
        {galleryPhotos.length > 0 && (
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Photos</p>
            <div className="grid grid-cols-3 gap-2">
              {galleryPhotos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-stone-100">
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intro video */}
        {p.intro_video_url && (() => {
          const video = getVideoEmbed(p.intro_video_url!)
          return (
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Meet {provider.name.split(' ')[0]}
              </p>
              {video.type === 'instagram' ? (
                <a
                  href={p.intro_video_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-5 rounded-2xl font-bold text-sm text-white transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}
                >
                  <span className="text-xl">▶</span> Watch on Instagram
                </a>
              ) : video.embedUrl ? (
                <div className="aspect-video rounded-2xl overflow-hidden bg-stone-100">
                  <iframe
                    src={video.embedUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                    title={`Intro video by ${provider.name}`}
                  />
                </div>
              ) : null}
            </div>
          )
        })()}

        {/* Reviews — only shown when approved reviews exist. No open form. */}
        {reviews.length > 0 && (
          <div className="mb-24">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Reviews
              </h2>
              <div className="flex items-center gap-1.5">
                <Stars rating={avgRating} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {avgRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{r.reviewer_name}</p>
                      <Stars rating={r.rating} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom spacer when no reviews section */}
        {reviews.length === 0 && <div className="mb-24" />}

      </div>

      {/* ── Sticky CTA — auth-gated ──────────────────────────────────── */}
      <ProviderCTABar
        providerId={provider.id}
        providerName={provider.name}
        categorySlug={provider.category_slug}
        whatsapp={provider.whatsapp}
        phone={provider.phone}
        isOwner={isOwner}
        shareUrl={shareUrl}
      />
    </div>
  )
}
