'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProviderWithPhotos } from '@/lib/supabase/types'
import { t, type Lang } from '@/lib/pro-translations'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ReviewLinkPanel({ whatsapp: _whatsapp }: { whatsapp: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch('/api/pro/review-invite', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate link')
      setUrl(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waMessage = url
    ? encodeURIComponent(`Hi! I had the pleasure of working with your pet. Please share your experience here: ${url}`)
    : ''
  const waHref = `https://wa.me/?text=${waMessage}`

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Get a Review Link</p>
      <p className="text-sm text-stone-600 leading-relaxed">
        Generate a single-use link to send to a client. Each link can only be used once — no spam.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {url ? (
        <div className="space-y-3">
          {/* Copyable URL */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 min-w-0 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-700 bg-stone-50 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="flex-shrink-0 px-3 py-2.5 rounded-xl border-2 border-[var(--pl-teal)] text-[var(--pl-teal)] text-xs font-bold hover:bg-teal-50 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* WhatsApp share */}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
            style={{ backgroundColor: '#25D366' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Share on WhatsApp
          </a>

          {/* Generate another */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                Generating…
              </span>
            ) : '↻ Generate new link'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[var(--pl-teal)] text-[var(--pl-teal)] text-sm font-bold hover:bg-teal-50 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-[var(--pl-teal)] border-t-transparent rounded-full animate-spin" />
              Generating…
            </>
          ) : '🔗 Get Review Link'}
        </button>
      )}
    </div>
  )
}

type Props = {
  provider: ProviderWithPhotos
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PRICE_UNITS = ['per session', 'per hour', 'per day', 'per month']

const LANGUAGE_OPTIONS = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Bengali']
const PET_TYPE_OPTIONS = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Fish', 'Reptile']
const NEIGHBOURHOOD_OPTIONS = ['Juhu', 'Versova', 'Andheri West', 'Andheri East', 'Santacruz', 'Bandra', 'Vile Parle']

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2.5 border-b border-stone-100 last:border-0">
      <span className="text-xs text-muted-foreground w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-stone-800 flex-1">{value}</span>
    </div>
  )
}

// ── Collapsible extra section ─────────────────────────────────────────────────

function CollapsibleSection({
  icon, title, subtitle, href, children,
}: {
  icon: string
  title: string
  subtitle: string
  href: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-stone-50"
      >
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-800">{title}</p>
          <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-stone-300 text-sm flex-shrink-0 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <div className="border-t border-stone-100 px-5 py-4 space-y-3">
          {children}
          <a
            href={href}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-50 transition-colors"
          >
            Open full page →
          </a>
        </div>
      )}
    </div>
  )
}

function MoreSections() {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pt-2">More</p>

      <CollapsibleSection
        icon="📊"
        title="Dashboard"
        subtitle="Profile views, WhatsApp clicks, reach"
        href="/pro/dashboard"
      >
        <p className="text-sm text-stone-500 leading-relaxed">
          See how many people viewed your profile, clicked WhatsApp, and found you — updated daily.
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        icon="📒"
        title="Bookings"
        subtitle="Booking requests from customers"
        href="/pro/bookings"
      >
        <p className="text-sm text-stone-500 leading-relaxed">
          View and manage booking requests. When a customer books through your profile, it appears here.
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        icon="🏃"
        title="Fitness"
        subtitle="Steps, distance, walk streaks"
        href="/pro/fitness"
      >
        <p className="text-sm text-stone-500 leading-relaxed">
          Track your activity across all walks — total distance, steps, and your walking streak.
        </p>
      </CollapsibleSection>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProProfileClient({ provider }: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    provider.provider_photos?.find(p => p.is_primary)?.url ?? provider.provider_photos?.[0]?.url ?? null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lang, setLang] = useState<Lang>(
    ((provider as unknown as { preferred_language?: string }).preferred_language as Lang) ?? 'en'
  )

  // Keep localStorage in sync so ProBottomNav can read the current language
  useEffect(() => {
    localStorage.setItem('pro_lang', lang)
  }, [lang])

  // Form state — seeded from provider
  const [form, setForm] = useState({
    name: provider.name ?? '',
    business_name: provider.business_name ?? '',
    whatsapp: provider.whatsapp ?? '',
    phone: provider.phone ?? '',
    bio: provider.bio ?? '',
    price_min: provider.price_min != null ? String(provider.price_min) : '',
    price_max: provider.price_max != null ? String(provider.price_max) : '',
    price_unit: provider.price_unit ?? 'per session',
    hours_from: provider.hours_from ?? '09:00',
    hours_to: provider.hours_to ?? '18:00',
    working_days: provider.working_days ?? [],
    is_emergency: provider.is_emergency ?? false,
    experience_years: (provider as unknown as { experience_years?: number | null }).experience_years != null
      ? String((provider as unknown as { experience_years?: number | null }).experience_years)
      : '',
    languages: (provider as unknown as { languages?: string[] | null }).languages ?? [],
    pet_types_handled: (provider as unknown as { pet_types_handled?: string[] | null }).pet_types_handled ?? [],
    neighbourhood_tags: (provider as unknown as { neighbourhood_tags?: string[] | null }).neighbourhood_tags ?? [],
    intro_note: (provider as unknown as { intro_note?: string | null }).intro_note ?? '',
    intro_video_url: (provider as unknown as { intro_video_url?: string | null }).intro_video_url ?? '',
  })

  function toggleDay(day: string) {
    setForm(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }))
  }

  function toggleChip(field: 'languages' | 'pet_types_handled' | 'neighbourhood_tags', value: string) {
    setForm(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(value)
        ? (prev[field] as string[]).filter(v => v !== value)
        : [...(prev[field] as string[]), value],
    }))
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Photo must be under 5 MB')
      return
    }
    setPhotoUploading(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${provider.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('provider-photos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage
        .from('provider-photos')
        .getPublicUrl(path)
      setPhotoUrl(publicUrl)
    } catch {
      setSaveError('Photo upload failed. Try again.')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/pro/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          business_name: form.business_name || null,
          whatsapp: form.whatsapp,
          phone: form.phone || null,
          bio: form.bio || null,
          price_min: form.price_min ? Number(form.price_min) : null,
          price_max: form.price_max ? Number(form.price_max) : null,
          price_unit: form.price_unit,
          hours_from: form.hours_from,
          hours_to: form.hours_to,
          working_days: form.working_days,
          is_emergency: form.is_emergency,
          photo_url: photoUrl,
          experience_years: form.experience_years ? Number(form.experience_years) : null,
          languages: form.languages.length > 0 ? form.languages : null,
          pet_types_handled: form.pet_types_handled.length > 0 ? form.pet_types_handled : null,
          neighbourhood_tags: form.neighbourhood_tags.length > 0 ? form.neighbourhood_tags : null,
          intro_note: form.intro_note || null,
          intro_video_url: form.intro_video_url || null,
          preferred_language: lang,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Failed to save')
      }
      setSaved(true)
      setMode('view')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const isVet = (provider.category_slugs ?? [provider.category_slug]).includes('vet')
  const primaryPhoto = provider.provider_photos?.find(p => p.is_primary) ?? provider.provider_photos?.[0]
  const pricingDisplay = provider.price_min
    ? `₹${provider.price_min}${provider.price_max ? `–${provider.price_max}` : ''} ${provider.price_unit}`
    : null

  // ── View mode ───────────────────────────────────────────────────────────────
  if (mode === 'view') {
    return (
      <div className="min-h-dvh pb-24" style={{ background: 'oklch(0.975 0.006 85)' }}>
        {/* Sticky header */}
        <header className="sticky top-0 z-40 bg-white border-b border-border">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="font-display text-xl text-stone-900">{t(lang, 'nav_profile')}</h1>
            <a
              href={`/provider/${provider.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[var(--pl-teal)] hover:opacity-80 transition-opacity"
            >
              View public →
            </a>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Success banner */}
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2">
            <span className="text-emerald-600">✓</span> Profile updated!
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex-shrink-0 overflow-hidden">
              {primaryPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryPhoto.url} alt={provider.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🐾</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-stone-900 truncate">{provider.name}</h1>
              {provider.business_name && (
                <p className="text-sm text-muted-foreground truncate">{provider.business_name}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-[var(--pl-teal)] border border-teal-100">
                  {provider.category_slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
                {provider.is_verified && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            <InfoRow label="WhatsApp" value={provider.whatsapp} />
            <InfoRow label="Phone" value={provider.phone} />
            <InfoRow label="Area" value={provider.address} />
            <InfoRow label="Hours" value={`${provider.hours_from} – ${provider.hours_to}`} />
            {provider.working_days?.length > 0 && (
              <InfoRow label="Days" value={provider.working_days.join(', ')} />
            )}
            <InfoRow label="Pricing" value={pricingDisplay} />
            <InfoRow label="Bio" value={provider.bio} />
          </div>
        </div>

        {/* Edit CTA */}
        <button
          onClick={() => setMode('edit')}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-[var(--pl-teal)] text-[var(--pl-teal)] text-sm font-bold hover:bg-teal-50 transition-colors active:scale-[0.98]"
        >
          ✏️ {t(lang, 'edit_profile')}
        </button>

        {/* Review link */}
        <ReviewLinkPanel whatsapp={provider.whatsapp} />

        {/* ── More sections ── */}
        <MoreSections />

        </div>{/* end inner */}
      </div>
    )
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh pb-24" style={{ background: 'oklch(0.975 0.006 85)' }}>
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-display text-xl text-stone-900">{t(lang, 'edit_profile')}</h1>
          <button
            onClick={() => setMode('view')}
            className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            {t(lang, 'cancel')}
          </button>
        </div>
      </header>

    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

      {/* Language selector — always visible at top */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-teal-700 mb-3 uppercase tracking-wide">
          {t(lang, 'language_pref')} / भाषा / भाषा
        </p>
        <div className="flex gap-2">
          {(['en', 'hi', 'mr'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                lang === l
                  ? 'bg-teal-600 text-white border-transparent'
                  : 'bg-white text-slate-700 border-stone-200 hover:border-teal-400'
              }`}
            >
              {l === 'en' ? '🇬🇧 English' : l === 'hi' ? '🇮🇳 हिंदी' : '🇮🇳 मराठी'}
            </button>
          ))}
        </div>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {saveError}
        </div>
      )}

      {/* Photo upload */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Profile Photo</p>
        <div className="flex items-center gap-4">
          {/* Preview */}
          <div className="w-20 h-20 rounded-2xl bg-stone-100 flex-shrink-0 overflow-hidden relative">
            {photoUploading ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-[var(--pl-teal)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
            )}
          </div>
          {/* Controls */}
          <div className="flex-1">
            <p className="text-sm text-stone-600 mb-2">
              {photoUrl ? 'Looking good! Tap to change.' : 'Add a photo to build trust with customers.'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <button
              type="button"
              disabled={photoUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl border-2 border-[var(--pl-teal)] text-[var(--pl-teal)] text-sm font-semibold hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              {photoUploading ? 'Uploading…' : photoUrl ? '📷 Change photo' : '📷 Add photo'}
            </button>
            <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG or WebP · Max 5 MB</p>
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Basic Info</p>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'your_name')} <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'business_name')}</label>
          <input
            type="text"
            value={form.business_name}
            onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))}
            placeholder="Optional"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'bio')} <span className="text-xs text-muted-foreground">({form.bio.length}/300)</span></label>
          <textarea
            rows={3}
            maxLength={300}
            value={form.bio}
            onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
            placeholder={t(lang, 'bio_placeholder')}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contact</p>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'whatsapp')} <span className="text-red-500">*</span></label>
          <input
            type="tel"
            required
            value={form.whatsapp}
            onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'phone')}</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pricing</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'price_min')}</label>
            <input
              type="number"
              min={0}
              value={form.price_min}
              onChange={e => setForm(p => ({ ...p, price_min: e.target.value }))}
              placeholder="e.g. 300"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'price_max')}</label>
            <input
              type="number"
              min={0}
              value={form.price_max}
              onChange={e => setForm(p => ({ ...p, price_max: e.target.value }))}
              placeholder="e.g. 500"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'price_unit')}</label>
          <select
            value={form.price_unit}
            onChange={e => setForm(p => ({ ...p, price_unit: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent bg-white"
          >
            {PRICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Hours & Days */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Availability</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'hours_from')}</label>
            <input
              type="time"
              value={form.hours_from}
              onChange={e => setForm(p => ({ ...p, hours_from: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'hours_to')}</label>
            <input
              type="time"
              value={form.hours_to}
              onChange={e => setForm(p => ({ ...p, hours_to: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">{t(lang, 'working_days')}</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  form.working_days.includes(day)
                    ? 'bg-[var(--pl-teal)] text-white border-[var(--pl-teal)]'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[var(--pl-teal)]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Emergency toggle — vets only */}
        {isVet && (
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-stone-800">Emergency available</p>
              <p className="text-xs text-muted-foreground">Show emergency badge on your profile</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, is_emergency: !p.is_emergency }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_emergency ? 'bg-[var(--pl-teal)]' : 'bg-stone-200'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_emergency ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Build trust */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Build trust</p>
          {lang !== 'en' && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === 'hi' ? 'बिश्वास बनाएं' : 'विश्वास निर्माण करा'}
            </p>
          )}
        </div>

        {/* Experience */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">{t(lang, 'experience')}</label>
          <input
            type="number"
            min={1}
            max={30}
            value={form.experience_years}
            onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))}
            placeholder="e.g. 5"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
          />
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">{t(lang, 'languages_spoken')}</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => toggleChip('languages', lang)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  (form.languages as string[]).includes(lang)
                    ? 'bg-[var(--pl-teal)] text-white border-[var(--pl-teal)]'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[var(--pl-teal)]'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Pet types */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">{t(lang, 'pet_types')}</label>
          <div className="flex flex-wrap gap-2">
            {PET_TYPE_OPTIONS.map(pet => (
              <button
                key={pet}
                type="button"
                onClick={() => toggleChip('pet_types_handled', pet)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  (form.pet_types_handled as string[]).includes(pet)
                    ? 'bg-[var(--pl-teal)] text-white border-[var(--pl-teal)]'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[var(--pl-teal)]'
                }`}
              >
                {pet}
              </button>
            ))}
          </div>
        </div>

        {/* Neighbourhoods */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">{t(lang, 'neighbourhoods')}</label>
          <div className="flex flex-wrap gap-2">
            {NEIGHBOURHOOD_OPTIONS.map(nbh => (
              <button
                key={nbh}
                type="button"
                onClick={() => toggleChip('neighbourhood_tags', nbh)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  (form.neighbourhood_tags as string[]).includes(nbh)
                    ? 'bg-[var(--pl-teal)] text-white border-[var(--pl-teal)]'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[var(--pl-teal)]'
                }`}
              >
                {nbh}
              </button>
            ))}
          </div>
        </div>

        {/* Tagline / intro_note */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            {t(lang, 'tagline')} <span className="text-xs text-muted-foreground">({form.intro_note.length}/120)</span>
          </label>
          <input
            type="text"
            maxLength={120}
            value={form.intro_note}
            onChange={e => setForm(p => ({ ...p, intro_note: e.target.value }))}
            placeholder={t(lang, 'tagline_placeholder')}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
          />
        </div>

        {/* Intro video */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">📹 {t(lang, 'video')}</label>
          <p className="text-xs text-muted-foreground mb-2">
            {t(lang, 'video_helper')}
          </p>
          <input
            type="text"
            value={form.intro_video_url}
            onChange={e => setForm(p => ({ ...p, intro_video_url: e.target.value }))}
            placeholder="https://www.instagram.com/reel/... or YouTube link"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
          />
          {form.intro_video_url && !['youtube.com', 'youtu.be', 'loom.com', 'instagram.com'].some(d => form.intro_video_url.includes(d)) && (
            <p className="text-xs text-red-500 mt-1.5">Please use a YouTube, Instagram, or Loom link</p>
          )}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !form.name || !form.whatsapp}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'oklch(0.48 0.17 196)' }}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t(lang, 'saving')}
          </span>
        ) : t(lang, 'save_changes')}
      </button>

      <div className="pb-6" />
    </div>{/* end inner */}
    </div>
  )
}
