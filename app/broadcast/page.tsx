'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Broadcast } from '@/lib/supabase/types'

const SERVICES = [
  { slug: 'dog-walking', label: 'Dog Walking', icon: '🦮' },
  { slug: 'grooming', label: 'Grooming', icon: '✂️' },
  { slug: 'vet', label: 'Vet', icon: '🏥' },
  { slug: 'pet-store', label: 'Pet Store', icon: '🐾' },
  { slug: 'dog-training', label: 'Dog Training', icon: '🎯' },
]

const MUMBAI_AREAS = [
  'Juhu', 'Andheri West', 'Andheri East', 'Bandra', 'Khar',
  'Santacruz', 'Vile Parle', 'Versova', 'JVLR', 'Lokhandwala',
]

const EASE_OUT_QUART = [0.25, 0.46, 0.45, 0.94] as const

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return `${Math.floor(diff / 60000)}m left`
  return `${hrs}h left`
}

function BroadcastCard({ b }: { b: Broadcast }) {
  const service = SERVICES.find((s) => s.slug === b.service_slug)
  const waLink = `https://wa.me/91${b.poster_whatsapp.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
    `Hi ${b.poster_name}, I saw your request on PawLocal for ${service?.label ?? b.service_slug}. I can help! 🐾`
  )}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
      className="bg-white rounded-2xl border border-border p-4 flex flex-col gap-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{service?.icon ?? '🐾'}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{service?.label ?? b.service_slug}</p>
            <p className="text-xs text-muted-foreground">{b.area} · {timeAgo(b.created_at)}</p>
          </div>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 whitespace-nowrap">
          {timeLeft(b.expires_at)}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1">
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">Pet: </span>{b.pet_description}
        </p>
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">When: </span>{b.date_needed}
        </p>
        {b.budget && (
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">Budget: </span>{b.budget}
          </p>
        )}
        {b.notes && (
          <p className="text-sm text-muted-foreground italic">"{b.notes}"</p>
        )}
      </div>

      {/* CTA */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#20b558] transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.054 23.454a.75.75 0 0 0 .918.918l5.595-1.479A11.934 11.934 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.68-.51-5.21-1.4l-.374-.22-3.878 1.024 1.024-3.878-.22-.374A9.974 9.974 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
        Reply to {b.poster_name}
      </a>
    </motion.div>
  )
}

type FormState = {
  service_slug: string
  pet_description: string
  area: string
  date_needed: string
  budget: string
  poster_name: string
  poster_whatsapp: string
  notes: string
}

const EMPTY_FORM: FormState = {
  service_slug: '',
  pet_description: '',
  area: '',
  date_needed: '',
  budget: '',
  poster_name: '',
  poster_whatsapp: '',
  notes: '',
}

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterService, setFilterService] = useState<string>('all')
  const [matchingProviders, setMatchingProviders] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/broadcasts')
      .then((r) => r.json())
      .then((data) => {
        setBroadcasts(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [submitted])

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.service_slug) { setError('Please pick a service type'); return }
    setSubmitting(true)

    const res = await fetch('/api/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong')
      setSubmitting(false)
      return
    }

    // Fetch matching providers before clearing form so we have service_slug
    const submittedSlug = form.service_slug
    setSubmitted(true)
    setForm(EMPTY_FORM)
    setSubmitting(false)

    // Load providers in this category to show in the confirmation
    const supabase = createClient()
    const { data } = await supabase
      .from('providers')
      .select('id, name, provider_photos(*)')
      .eq('status', 'approved')
      .contains('category_slugs', [submittedSlug])
      .limit(4)
    setMatchingProviders(data ?? [])

    // Scroll to feed
    setTimeout(() => {
      document.getElementById('broadcast-feed')?.scrollIntoView({ behavior: 'smooth' })
    }, 400)
  }

  const filtered = filterService === 'all'
    ? broadcasts
    : broadcasts.filter((b) => b.service_slug === filterService)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--pl-teal)]/10 flex items-center justify-center text-2xl">
            📣
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Pet Broadcast</h1>
            <p className="text-sm text-muted-foreground">Post a need · Providers reply on WhatsApp</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Need a groomer this weekend? Looking for an emergency vet? Post your request — verified providers near you will reach out directly.{' '}
          <span className="font-medium text-foreground">No booking fees. No middleman.</span>
        </p>
      </div>

      {/* Post form */}
      <div className="bg-white rounded-2xl border border-border p-5 mb-8">
        <h2 className="text-base font-semibold mb-4">Post a Request</h2>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center"
            >
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-semibold text-foreground mb-1 text-lg">Your request is live!</p>

              {/* Provider avatars + count */}
              <div className="mt-4 mb-5">
                {matchingProviders.length > 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    {/* Avatar stack */}
                    <div className="flex items-center">
                      {matchingProviders.slice(0, 3).map((prov, i) => {
                        const primaryPhoto = Array.isArray(prov.provider_photos)
                          ? prov.provider_photos.find((ph: any) => ph.is_primary) ?? prov.provider_photos[0]
                          : null
                        return (
                          <div
                            key={prov.id}
                            className={`w-10 h-10 rounded-full border-2 border-white overflow-hidden flex items-center justify-center bg-[var(--pl-teal)]/10 flex-shrink-0 ${i > 0 ? '-ml-2' : ''}`}
                          >
                            {primaryPhoto?.url ? (
                              <img src={primaryPhoto.url} alt={prov.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-base">🐾</span>
                            )}
                          </div>
                        )
                      })}
                      {matchingProviders.length > 3 && (
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 -ml-2 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-semibold text-slate-500">+{matchingProviders.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[var(--pl-teal)]">
                      {matchingProviders.length} verified provider{matchingProviders.length !== 1 ? 's' : ''} in Juhu {matchingProviders.length !== 1 ? 'have' : 'has'} been notified
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-xs mx-auto">
                    We'll personally connect you with the right provider within 2 hours 🐾
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-5">
                Providers will WhatsApp you directly. Expires in 48 hours.
              </p>
              <button
                onClick={() => { setSubmitted(false); setMatchingProviders([]) }}
                className="text-sm font-medium text-[var(--pl-teal)] hover:underline"
              >
                Post another request
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Service type */}
              <div>
                <label className="block text-sm font-medium mb-2">What do you need? *</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, service_slug: s.slug }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        form.service_slug === s.slug
                          ? 'bg-[var(--pl-teal)] text-white border-transparent'
                          : 'bg-white text-foreground border-border hover:border-[var(--pl-teal)]'
                      }`}
                    >
                      <span>{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pet description */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Describe your pet *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2yr old Labrador, friendly and vaccinated"
                  maxLength={150}
                  required
                  {...field('pet_description')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]/30 focus:border-[var(--pl-teal)]"
                />
              </div>

              {/* Area + When — 2 col */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Your area *</label>
                  <select
                    required
                    {...field('area')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]/30 focus:border-[var(--pl-teal)] bg-white"
                  >
                    <option value="">Select area</option>
                    {MUMBAI_AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">When do you need it? *</label>
                  <input
                    type="text"
                    placeholder="e.g. This Saturday, ASAP"
                    maxLength={60}
                    required
                    {...field('date_needed')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]/30 focus:border-[var(--pl-teal)]"
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Budget <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ₹400–600 or Flexible"
                  maxLength={60}
                  {...field('budget')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]/30 focus:border-[var(--pl-teal)]"
                />
              </div>

              {/* Name + WhatsApp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Your name *</label>
                  <input
                    type="text"
                    placeholder="Meera"
                    maxLength={80}
                    required
                    {...field('poster_name')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]/30 focus:border-[var(--pl-teal)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">WhatsApp number *</label>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    maxLength={15}
                    required
                    {...field('poster_whatsapp')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]/30 focus:border-[var(--pl-teal)]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Extra notes <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Any allergies, special requirements..."
                  maxLength={300}
                  rows={2}
                  {...field('notes')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]/30 focus:border-[var(--pl-teal)] resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3.5 py-2.5 rounded-xl">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[var(--pl-teal)] text-white font-semibold text-sm hover:bg-[var(--pl-teal-hover)] transition-colors disabled:opacity-60"
              >
                {submitting ? 'Posting…' : '📣 Post Request (free)'}
              </button>

              <p className="text-[11px] text-muted-foreground text-center">
                Visible to verified providers for 48 hours · Your number is only shared when they reply
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Live feed */}
      <div id="broadcast-feed">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">
            Live Requests
            {!loading && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({filtered.length} active)
              </span>
            )}
          </h2>

          {/* Filter chips */}
          <div className="flex gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => setFilterService('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterService === 'all'
                  ? 'bg-foreground text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            {SERVICES.map((s) => (
              <button
                key={s.slug}
                onClick={() => setFilterService(s.slug)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterService === s.slug
                    ? 'bg-foreground text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse h-36" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-medium">No active requests right now</p>
            <p className="text-sm mt-1">Be the first to post — providers will reply within minutes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <BroadcastCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
