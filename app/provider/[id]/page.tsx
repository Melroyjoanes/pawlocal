import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCategoryBySlug } from '@/lib/categories'
import type { ProviderWithPhotos, Review, TrainerMetadata } from '@/lib/supabase/types'
import { Stars } from '@/components/StarRating'
import { TrackView } from '@/components/ProviderTracker'
import VerificationBadge from '@/components/VerificationBadge'
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
  if (!data) return { title: 'Provider not found | PupStep' }

  const serviceLabel = data.category_slug.replace(/-/g, ' ')
  const title = `${data.name} — ${serviceLabel} in Mumbai | PupStep`
  const description = data.bio
    ? `${data.bio.slice(0, 140)}${data.bio.length > 140 ? '…' : ''}`
    : `${data.name} is a verified ${serviceLabel} provider in Mumbai. Contact directly on WhatsApp. Zero booking fees.`

  return {
    title,
    description,
    keywords: [`${serviceLabel} Mumbai`, `${serviceLabel} Juhu`, data.name, `verified ${serviceLabel}`, 'WhatsApp pet services Mumbai'],
    alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/provider/${id}` },
    openGraph: { title, description, type: 'profile', siteName: 'PupStep' },
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

  // Fire all 3 queries in parallel — saves ~200-400ms vs sequential awaits
  const [reviewsResult, jobsResult, walksResult] = await Promise.all([
    supabase
      .from('reviews')
      .select('*')
      .eq('provider_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
    supabase
      .from('booking_requests')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', id)
      .eq('status', 'completed'),
    (supabase as any)
      .from('walk_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', provider.id)
      .eq('status', 'completed'),
  ])

  const reviews = (reviewsResult.data ?? []) as unknown as Review[]
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  const totalJobs = (jobsResult.count ?? 0) + (walksResult.count ?? 0)
  const memberSince = new Date(provider.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const primaryPhoto =
    provider.provider_photos.find((p) => p.is_primary) ?? provider.provider_photos[0]
  const galleryPhotos = provider.provider_photos
    .filter((p) => !p.is_primary)
    .sort((a, b) => a.sort_order - b.sort_order)

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(
    `🐾 Check out ${provider.name} for ${category.name} near Juhu!\n\n${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/provider/${provider.id}`
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

  const serviceLabel = category.name

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": provider.name,
            "description": provider.bio ?? `${provider.name} — verified ${serviceLabel} in Mumbai.`,
            "url": `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/provider/${provider.id}`,
            "image": primaryPhoto?.url ?? undefined,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": (provider as unknown as { neighbourhood?: string }).neighbourhood ?? "Juhu",
              "addressRegion": "Mumbai",
              "addressCountry": "IN"
            },
            "geo": { "@type": "GeoCoordinates", "latitude": provider.lat, "longitude": provider.lng },
            "areaServed": { "@type": "City", "name": "Mumbai" },
            "priceRange": "₹",
            "aggregateRating": avgRating > 0 ? {
              "@type": "AggregateRating",
              "ratingValue": avgRating.toFixed(1),
              "reviewCount": reviews.length,
              "bestRating": "5",
              "worstRating": "1"
            } : undefined,
            "review": reviews.slice(0, 5).map(r => ({
              "@type": "Review",
              "reviewRating": { "@type": "Rating", "ratingValue": r.rating },
              "author": { "@type": "Person", "name": r.reviewer_name ?? "Pet Parent" },
              "reviewBody": r.comment ?? undefined,
            })),
          })
        }}
      />
    <div className="max-w-2xl mx-auto">
      <TrackView providerId={provider.id} />

      {/* ── Hero: cover strip + floating circular avatar ───────────── */}
      <div className="relative -mx-4">
        {/* Cover photo strip — overflow-hidden only on the inner div so avatar can escape */}
        <div className="relative h-44 sm:h-52 overflow-hidden">
          <a
            href={`/${provider.category_slug}`}
            className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-black/50 transition-colors"
          >
            ← {category.name}
          </a>

          {/* Cover: use gallery photo if available, else primary, else gradient */}
          {galleryPhotos.length > 0 ? (
            <img
              src={galleryPhotos[0].url}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : primaryPhoto ? (
            <img
              src={primaryPhoto.url}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, oklch(0.48 0.17 196) 0%, oklch(0.70 0.14 75) 100%)`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-10 select-none">
                {category.icon}
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        {/* Circular avatar — overlaps cover by half its height (48px) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{ bottom: '-48px' }}
        >
          <div
            className="w-24 h-24 rounded-full overflow-hidden bg-stone-100 flex-shrink-0"
            style={{
              boxShadow: '0 0 0 4px white, 0 0 0 5px oklch(0.90 0.06 75 / 0.4), 0 6px 24px rgba(0,0,0,0.16)',
            }}
          >
            {primaryPhoto ? (
              <img src={primaryPhoto.url} alt={provider.name} fetchPriority="high" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-4xl"
                style={{ background: `linear-gradient(145deg, ${category.color}22, ${category.color}44)` }}
              >
                {category.icon}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Identity block — name, badges, stats ─────────────────────── */}
      {/* pt-16 = 64px to clear the 48px avatar overlap + breathing room */}
      <div className="pt-16 pb-5 text-center px-2">
        <h1
          className="text-2xl font-bold leading-tight mb-1 text-stone-900"
          style={{ fontFamily: 'var(--font-serif, "DM Serif Display", serif)' }}
        >
          {provider.name}
        </h1>
        {provider.business_name && provider.business_name !== provider.name && (
          <p className="text-sm text-stone-500 mb-2">{provider.business_name}</p>
        )}

        {/* Badges row */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: category.color + '18', color: category.color, border: `1px solid ${category.color}35` }}
          >
            {category.icon} {category.name}
          </span>
          <VerificationBadge
            tier={(provider.verification_tier as 'contacted' | 'verified' | 'certified') ?? 'contacted'}
            size="md"
          />
          {p.intro_video_url && (
            <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-full bg-pink-50 text-pink-600 border border-pink-100">
              📹 Video
            </span>
          )}
          {reviews.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-stone-600">
              <Stars rating={avgRating} count={reviews.length} size="sm" />
            </span>
          )}
        </div>

        {/* ── Trust stats row — experience is the hero number ────────── */}
        {(p.experience_years || totalJobs > 0 || avgRating > 0) && (
          <div className="flex items-stretch justify-center gap-2.5 mb-1">
            {p.experience_years && p.experience_years > 0 && (
              <div
                className="flex flex-col items-center justify-center px-5 py-3 rounded-2xl min-w-[72px]"
                style={{
                  background: 'oklch(0.97 0.06 75 / 0.6)',
                  border: '1px solid oklch(0.88 0.12 75)',
                  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9)',
                }}
              >
                <p className="text-xl font-bold leading-none text-amber-800">{p.experience_years}</p>
                <p className="text-[10px] font-semibold text-amber-600 mt-0.5 leading-none">
                  {p.experience_years === 1 ? 'yr exp' : 'yrs exp'}
                </p>
              </div>
            )}
            {totalJobs > 0 && (
              <div
                className="flex flex-col items-center justify-center px-5 py-3 rounded-2xl min-w-[72px]"
                style={{
                  background: 'oklch(0.96 0.04 196 / 0.5)',
                  border: '1px solid oklch(0.88 0.06 196)',
                  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9)',
                }}
              >
                <p className="text-xl font-bold leading-none" style={{ color: 'oklch(0.36 0.12 196)' }}>{totalJobs}</p>
                <p className="text-[10px] font-semibold mt-0.5 leading-none" style={{ color: 'oklch(0.48 0.10 196)' }}>jobs done</p>
              </div>
            )}
            {avgRating > 0 && (
              <div
                className="flex flex-col items-center justify-center px-5 py-3 rounded-2xl min-w-[72px]"
                style={{
                  background: 'oklch(0.975 0.003 75)',
                  border: '1px solid oklch(0.90 0.02 75)',
                  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9)',
                }}
              >
                <p className="text-xl font-bold leading-none text-stone-800">⭐ {avgRating.toFixed(1)}</p>
                <p className="text-[10px] font-semibold text-stone-500 mt-0.5 leading-none">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>
              </div>
            )}
          </div>
        )}

        {/* Member since — subtle, below stats */}
        <p className="text-[11px] text-stone-400 mt-2">Member since {memberSince}</p>
      </div>

      {/* ── Content body ─────────────────────────────────────────────── */}
      <div className="pt-1 px-2">

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

        {/* ── Quick-scan info strip ─────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-5">
          {provider.price_min && (
            <span
              className="clay-chip inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold"
              style={{
                background: 'oklch(0.97 0.06 75 / 0.5)',
                border: '1px solid oklch(0.88 0.12 75)',
                color: 'oklch(0.40 0.15 75)',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85)',
              }}
            >
              ₹{provider.price_min}
              {provider.price_max && provider.price_max !== provider.price_min && `–${provider.price_max}`}
              {provider.price_unit && (
                <span className="font-normal text-xs ml-0.5 opacity-70">
                  /{provider.price_unit.replace('per ', '')}
                </span>
              )}
            </span>
          )}
          <span
            className="clay-chip inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
            style={{ background: 'oklch(0.96 0.04 196 / 0.5)', border: '1px solid oklch(0.88 0.06 196)', color: 'oklch(0.36 0.12 196)', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85)' }}
          >
            🕐 {formatHour(provider.hours_from)}–{formatHour(provider.hours_to)}
            <span className="opacity-50 text-xs">
              {provider.working_days.slice(0, 3).map((d: string) => d.slice(0, 3)).join(' · ')}
              {provider.working_days.length > 3 ? ` +${provider.working_days.length - 3}` : ''}
            </span>
          </span>
          <span
            className="clay-chip inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
            style={{
              background: 'oklch(0.975 0.003 75)',
              border: '1px solid oklch(0.90 0.02 75)',
              color: 'oklch(0.42 0.03 75)',
              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85)',
            }}
          >
            📍 <span className="line-clamp-1">{provider.address}</span>
          </span>
        </div>

        {/* Language + neighbourhood chips — if any */}
        {(p.languages?.length || p.neighbourhood_tags?.length) && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {p.languages?.map(lang => (
              <span key={lang} className="clay-chip text-xs px-3 py-1.5 font-medium bg-stone-50 border border-stone-100 text-stone-600">
                🗣 {lang}
              </span>
            ))}
            {p.neighbourhood_tags?.map(tag => (
              <span key={tag} className="clay-chip text-xs px-3 py-1.5 font-medium bg-stone-50 border border-stone-100 text-stone-500">
                📌 {tag}
              </span>
            ))}
          </div>
        )}

        {/* Intro note — only show if it's a real sentence, not just "11 years" */}
        {p.intro_note && p.intro_note.trim().length > 30 && (
          <div
            className="mb-6 px-4 py-3.5 rounded-2xl text-base leading-relaxed"
            style={{
              background: 'oklch(0.96 0.04 196 / 0.4)',
              border: '1px solid oklch(0.88 0.06 196)',
              color: 'oklch(0.28 0.10 196)',
            }}
          >
            <span style={{ fontSize: '1.25rem', opacity: 0.4, marginRight: '0.25rem' }}>"</span>
            {p.intro_note}
            <span style={{ fontSize: '1.25rem', opacity: 0.4, marginLeft: '0.15rem' }}>"</span>
          </div>
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
        {provider.bio && provider.bio.trim().length > 0 && (
          <p
            className="leading-relaxed mb-7"
            style={{
              color: provider.bio.length < 80
                ? 'oklch(0.58 0.03 75)'   // short instagram-style bio → muted
                : 'oklch(0.42 0.03 75)',   // longer real bio → normal
              fontSize: provider.bio.length < 80 ? '0.8125rem' : '0.9375rem',
            }}
          >
            {provider.bio}
          </p>
        )}

        {/* Trainer details */}
        {provider.category_slug === 'dog-training' && provider.metadata && (() => {
          const t = provider.metadata as TrainerMetadata
          const hasAny = t.training_methods?.length || t.specialisations?.length || t.session_format || t.certifications || t.breeds
          if (!hasAny) return null
          return (
            <div className="mb-7">
              <p className="text-sm font-semibold text-stone-500 mb-4">Trainer details</p>
              <div className="flex flex-col gap-4">
                {t.training_methods && t.training_methods.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Training method</p>
                    <div className="flex flex-wrap gap-2">
                      {t.training_methods.map((m) => (
                        <span key={m} className="clay-chip px-3 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {t.specialisations && t.specialisations.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Specialises in</p>
                    <div className="flex flex-wrap gap-2">
                      {t.specialisations.map((s) => (
                        <span key={s} className="clay-chip px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {t.session_format && (
                    <div className="clay-card p-4">
                      <p className="text-xs text-muted-foreground mb-1">Session format</p>
                      <p className="text-sm font-medium text-foreground">{t.session_format}</p>
                    </div>
                  )}
                  {t.certifications && (
                    <div className="clay-card p-4">
                      <p className="text-xs text-muted-foreground mb-1">Certifications</p>
                      <p className="text-sm font-medium text-foreground">{t.certifications}</p>
                    </div>
                  )}
                </div>
                {t.breeds && (
                  <div className="clay-card p-4">
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
            <p className="text-sm font-semibold text-stone-500 mb-3">Photos</p>
            <div className="grid grid-cols-3 gap-2">
              {galleryPhotos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-stone-100">
                  <img src={photo.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
              <p className="text-sm font-semibold text-stone-500 mb-3">
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

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mb-24">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-stone-500">
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
                <div key={r.id} className="clay-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{r.reviewer_name}</p>
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

        {reviews.length === 0 && <div className="mb-24" />}

      </div>

      {/* ── Sticky CTA ────────────────────────────────────────────────── */}
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
    </>
  )
}
