'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, JUHU_CENTER } from '@/lib/categories'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'

// Insurance is an affiliate page — providers can't list there
const SERVICE_CATEGORIES = CATEGORIES.filter((c) => c.slug !== 'insurance')

export default function JoinPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [pin, setPin] = useState(JUHU_CENTER)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    business_name: '',
    category_slugs: ['dog-walking'] as string[],
    whatsapp: '',
    phone: '',
    address: '',
    price_min: '',
    price_max: '',
    price_unit: 'per session',
    hours_from: '09:00',
    hours_to: '18:00',
    bio: '',
    is_emergency: false,
  })

  // Trainer-specific metadata (shown only when dog-training is selected)
  const [trainerMeta, setTrainerMeta] = useState({
    training_methods: [] as string[],
    specialisations: [] as string[],
    session_format: '',
    certifications: '',
    breeds: '',
  })

  const isTrainer = form.category_slugs.includes('dog-training')

  function toggleChip<T extends string>(
    list: T[],
    value: T,
    setter: (fn: (prev: typeof list) => typeof list) => void
  ) {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function toggleCategory(slug: string) {
    setForm((prev) => {
      const has = prev.category_slugs.includes(slug)
      if (has && prev.category_slugs.length === 1) return prev // need at least one
      return {
        ...prev,
        category_slugs: has
          ? prev.category_slugs.filter((s) => s !== slug)
          : [...prev.category_slugs, slug],
      }
    })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3)
    if (!files.length) return
    setUploading(true)
    const supabase = createClient()
    const urls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('provider-photos').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    setPhotoUrls((prev) => [...prev, ...urls].slice(0, 3))
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.category_slugs.length === 0) return
    setSubmitting(true)
    setSubmitError('')
    const metadata = isTrainer ? {
      training_methods: trainerMeta.training_methods,
      specialisations: trainerMeta.specialisations,
      session_format: trainerMeta.session_format || null,
      certifications: trainerMeta.certifications.trim() || null,
      breeds: trainerMeta.breeds.trim() || null,
    } : null

    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        category_slug: form.category_slugs[0],
        lat: pin.lat,
        lng: pin.lng,
        photo_urls: photoUrls,
        metadata,
        is_emergency: form.is_emergency,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      router.push(`/join/success?name=${encodeURIComponent(form.name)}`)
    } else {
      const err = await res.json().catch(() => ({}))
      setSubmitError(err.error ?? 'Something went wrong. Please try again or WhatsApp us.')
    }
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="max-w-xl mx-auto pb-12">
        <h1 className="text-2xl font-bold mb-1">List your service</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Free forever. Takes 5 minutes. We&apos;ll review and go live within 24 hours.
        </p>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-2">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Your name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
              placeholder="Ravi Kumar"
            />
          </div>

          {/* Business name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Business name (optional)</label>
            <input
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
              placeholder="Ravi&apos;s Dog Walk"
            />
          </div>

          {/* Service type — multi-select chips */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Service type * <span className="text-muted-foreground font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_CATEGORIES.map((c) => {
                const selected = form.category_slugs.includes(c.slug)
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => toggleCategory(c.slug)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                      selected
                        ? 'text-white border-transparent'
                        : 'bg-white text-foreground border-border hover:border-[var(--pl-teal)]'
                    }`}
                    style={selected ? { backgroundColor: 'var(--pl-teal)', borderColor: 'var(--pl-teal)' } : {}}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                    {selected && <span className="text-xs opacity-80">✓</span>}
                  </button>
                )
              })}
            </div>
            {form.category_slugs.length === 0 && (
              <p className="text-xs text-red-500 mt-1.5">Please select at least one service type.</p>
            )}
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium mb-1.5">WhatsApp number *</label>
            <input
              required
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
              placeholder="98765 43210"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone (optional)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
              placeholder="98765 43210"
            />
          </div>

          {/* Address — plain text */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Your address / area *</label>
            <input
              required
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
              placeholder="e.g. JVPD Scheme, Juhu, Mumbai 400049"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Then tap the map below to drop your pin.
            </p>
          </div>

          {/* Map — tap to drop pin */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Drop your pin on the map *</label>
            <p className="text-xs text-muted-foreground mb-2">
              Tap anywhere on the map to mark your exact location.
            </p>
            <div className="h-52 rounded-xl overflow-hidden border border-border">
              <Map
                defaultCenter={JUHU_CENTER}
                defaultZoom={15}
                mapId="2e772a5d74f171be6814c0ca"
                className="w-full h-full"
                gestureHandling="greedy"
                onClick={(e) => {
                  if (e.detail.latLng) setPin(e.detail.latLng)
                }}
              >
                <AdvancedMarker position={pin} />
              </Map>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Min price (₹)</label>
              <input
                type="number"
                value={form.price_min}
                onChange={(e) => setForm({ ...form, price_min: e.target.value })}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
                placeholder="300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Max price (₹)</label>
              <input
                type="number"
                value={form.price_max}
                onChange={(e) => setForm({ ...form, price_max: e.target.value })}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
                placeholder="600"
              />
            </div>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Opens at</label>
              <input
                type="time"
                value={form.hours_from}
                onChange={(e) => setForm({ ...form, hours_from: e.target.value })}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Closes at</label>
              <input
                type="time"
                value={form.hours_to}
                onChange={(e) => setForm({ ...form, hours_to: e.target.value })}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
              />
            </div>
          </div>

          {/* Emergency tag — vets only */}
          {form.category_slugs.includes('vet') && (
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.is_emergency}
                onChange={(e) => setForm({ ...form, is_emergency: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded accent-[var(--pl-teal)]"
              />
              <div>
                <p className="text-sm font-medium text-foreground">We offer 24hr / emergency services</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tick this only if you genuinely have emergency or after-hours availability.
                  This helps pet owners find you during urgent situations.
                </p>
              </div>
            </label>
          )}

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Short bio (max 200 chars)</label>
            <textarea
              maxLength={200}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] resize-none bg-white"
              rows={3}
              placeholder="I&apos;ve walked 50+ dogs in Juhu for 3 years. Trained in basic pet first aid."
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{form.bio.length}/200</p>
          </div>

          {/* ── Trainer-specific fields (shown only when Dog Training selected) ── */}
          {isTrainer && (
            <div className="flex flex-col gap-5 border border-border rounded-2xl p-5 bg-white">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                🎯 Dog Trainer details
                <span className="text-xs font-normal text-muted-foreground">helps owners find the right fit</span>
              </p>

              {/* Training methods */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Training method <span className="text-muted-foreground font-normal">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Positive Reinforcement', 'Clicker Training', 'Balanced', 'Board & Train'].map((m) => {
                    const selected = trainerMeta.training_methods.includes(m)
                    return (
                      <button
                        key={m} type="button"
                        onClick={() => toggleChip(trainerMeta.training_methods, m, (fn) => setTrainerMeta(p => ({ ...p, training_methods: fn(p.training_methods) })))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selected ? 'text-white border-transparent' : 'bg-white text-foreground border-border hover:border-[var(--pl-teal)]'}`}
                        style={selected ? { backgroundColor: 'var(--pl-teal)' } : {}}
                      >{m}</button>
                    )
                  })}
                </div>
              </div>

              {/* Specialisations */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  I specialise in <span className="text-muted-foreground font-normal">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Puppy Training', 'Basic Obedience', 'Aggression Rehab', 'Separation Anxiety', 'Competitive Obedience', 'Trick Training'].map((s) => {
                    const selected = trainerMeta.specialisations.includes(s)
                    return (
                      <button
                        key={s} type="button"
                        onClick={() => toggleChip(trainerMeta.specialisations, s, (fn) => setTrainerMeta(p => ({ ...p, specialisations: fn(p.specialisations) })))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selected ? 'text-white border-transparent' : 'bg-white text-foreground border-border hover:border-[var(--pl-teal)]'}`}
                        style={selected ? { backgroundColor: 'var(--pl-teal)' } : {}}
                      >{s}</button>
                    )
                  })}
                </div>
              </div>

              {/* Session format */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Session format</label>
                <div className="flex flex-wrap gap-2">
                  {['Home visits', 'Training centre', 'Group classes', 'Online'].map((f) => {
                    const selected = trainerMeta.session_format === f
                    return (
                      <button
                        key={f} type="button"
                        onClick={() => setTrainerMeta(p => ({ ...p, session_format: selected ? '' : f }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selected ? 'text-white border-transparent' : 'bg-white text-foreground border-border hover:border-[var(--pl-teal)]'}`}
                        style={selected ? { backgroundColor: 'var(--pl-teal)' } : {}}
                      >{f}</button>
                    )
                  })}
                </div>
              </div>

              {/* Breeds */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Breeds you work with <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  value={trainerMeta.breeds}
                  onChange={(e) => setTrainerMeta(p => ({ ...p, breeds: e.target.value }))}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
                  placeholder="Labrador, German Shepherd, Golden Retriever..."
                />
              </div>

              {/* Certifications */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Certifications <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  value={trainerMeta.certifications}
                  onChange={(e) => setTrainerMeta(p => ({ ...p, certifications: e.target.value }))}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
                  placeholder="CPDT-KA, KPA-CTP..."
                />
              </div>
            </div>
          )}

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Photos (up to 3)</label>
            <p className="text-xs text-muted-foreground mb-2">First photo will be your profile picture</p>
            <div className="flex gap-3 flex-wrap">
              {photoUrls.map((url, i) => (
                <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {photoUrls.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-2xl hover:border-[var(--pl-teal)] transition-colors"
                >
                  {uploading ? '…' : '+'}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || uploading || form.category_slugs.length === 0}
            className="w-full text-white py-4 rounded-2xl font-semibold text-base transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--pl-teal)' }}
          >
            {submitting ? 'Submitting…' : "Submit for review — it's free"}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            We review every listing manually. You&apos;ll hear from us on WhatsApp within 24 hours.
          </p>
        </form>
      </div>
    </APIProvider>
  )
}
