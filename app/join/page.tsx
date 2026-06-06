'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/categories'
import GoogleSignInButton from '@/components/GoogleSignInButton'

const SERVICE_CATEGORIES = CATEGORIES.filter((c) => c.slug !== 'insurance')

const MUMBAI_AREAS = [
  'Juhu', 'Andheri West', 'Andheri East', 'Bandra', 'Khar',
  'Santacruz', 'Vile Parle', 'Versova', 'JVLR', 'Lokhandwala',
  'Oshiwara', 'DN Nagar', 'Goregaon West', 'Malad West',
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PRICE_UNITS = [
  'per session', 'per hour', 'per visit', 'per month',
  'per day', 'per grooming', 'per consultation',
]

const STEPS = ['Sign in', 'About you', 'Your services', 'Done!']

export default function JoinPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Google account state
  const [authChecked, setAuthChecked] = useState(false)
  const [googleName, setGoogleName] = useState('')
  const [googleAvatar, setGoogleAvatar] = useState<string | null>(null)
  const [googleEmail, setGoogleEmail] = useState('')

  // Form state — all fields
  const [form, setForm] = useState({
    name: '',
    business_name: '',
    whatsapp: '',
    phone: '',
    bio: '',
    area: '',
    category_slugs: [] as string[],
    price_min: '',
    price_max: '',
    price_unit: 'per session',
    hours_from: '09:00',
    hours_to: '18:00',
    working_days: [] as string[],
    is_emergency: false,
  })

  // On mount: check if already signed in (returning from OAuth)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata ?? {}
        const name = meta.full_name ?? meta.name ?? ''
        setGoogleName(name)
        setGoogleEmail(data.user.email ?? '')
        setGoogleAvatar(meta.avatar_url ?? meta.picture ?? null)
        setForm(prev => ({ ...prev, name: prev.name || name }))
        setStep(prev => prev === 0 ? 1 : prev)
      }
      setAuthChecked(true)
    })
  }, [])

  function toggleCategory(slug: string) {
    setForm(prev => ({
      ...prev,
      category_slugs: prev.category_slugs.includes(slug)
        ? prev.category_slugs.filter(s => s !== slug)
        : [...prev.category_slugs, slug],
    }))
  }

  function toggleDay(day: string) {
    setForm(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }))
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('provider-photos').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
      setPhotoUrl(data.publicUrl)
    }
    setUploading(false)
  }

  async function handleSubmit() {
    if (form.category_slugs.length === 0) return
    setSubmitting(true)
    setSubmitError('')

    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        business_name: form.business_name.trim() || null,
        whatsapp: form.whatsapp.trim(),
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        category_slug: form.category_slugs[0],
        category_slugs: form.category_slugs,
        area: form.area,
        address: form.area + ', Mumbai',
        photo_urls: photoUrl ? [photoUrl] : [],
        price_min: form.price_min ? Number(form.price_min) : null,
        price_max: form.price_max ? Number(form.price_max) : null,
        price_unit: form.price_unit,
        hours_from: form.hours_from,
        hours_to: form.hours_to,
        working_days: form.working_days,
        is_emergency: form.is_emergency,
        lat: 19.1075,
        lng: 72.8263,
      }),
    })

    setSubmitting(false)
    if (res.ok) {
      router.push(`/join/success?name=${encodeURIComponent(form.name)}`)
    } else {
      const err = await res.json().catch(() => ({}))
      setSubmitError(err.error ?? 'Something went wrong. Please try again.')
    }
  }

  // Validation
  const canNext1 = form.name.trim().length >= 2 && form.whatsapp.replace(/\D/g, '').length >= 10
  const canSubmit = canNext1 && form.category_slugs.length > 0 && form.area.length > 0

  const hasVet = form.category_slugs.includes('vet')

  if (!authChecked) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 flex justify-center">
        <div className="w-6 h-6 border-2 border-[var(--pl-teal)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4 pb-20">

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-5">
          {STEPS.slice(1).map((s, i) => {
            const realStep = i + 1
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > realStep ? 'bg-emerald-500 text-white' :
                  step === realStep ? 'bg-[var(--pl-teal)] text-white' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {step > realStep ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === realStep ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s}
                </span>
                {i < STEPS.slice(1).length - 2 && <div className="w-6 h-px bg-slate-200 mx-1" />}
              </div>
            )
          })}
        </div>

        {step === 0 && <h1 className="text-2xl font-bold text-slate-900">List your services free</h1>}
        {step === 0 && <p className="text-sm text-slate-500 mt-1">Sign in with Google first — takes 10 seconds.</p>}
        {step === 1 && <h1 className="text-2xl font-bold text-slate-900">About you</h1>}
        {step === 1 && <p className="text-sm text-slate-500 mt-1">Tell us about yourself and your experience.</p>}
        {step === 2 && <h1 className="text-2xl font-bold text-slate-900">Your services</h1>}
        {step === 2 && <p className="text-sm text-slate-500 mt-1">What you offer, where, and at what price.</p>}
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-5">
          {submitError}
        </div>
      )}

      {/* ── Step 0: Google sign-in ── */}
      {step === 0 && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex flex-col gap-3 mb-6">
              {[
                { icon: '🔐', text: 'Your account is secured — only you can edit your profile' },
                { icon: '📊', text: 'Access your dashboard, stats, and leads anytime' },
                { icon: '🚫', text: 'No one else can claim your listing' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <p className="text-sm text-slate-700">{item.text}</p>
                </div>
              ))}
            </div>
            <GoogleSignInButton redirectNext="/join" label="Continue with Google" />
          </div>
          <p className="text-xs text-center text-slate-400">
            Already listed?{' '}
            <a href="/my-listing" className="underline hover:text-slate-600">Access your dashboard →</a>
          </p>
        </div>
      )}

      {/* ── Step 1: About you ── */}
      {step === 1 && (
        <div className="flex flex-col gap-5">

          {/* Signed in as */}
          {googleEmail && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              {googleAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={googleAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700 flex-shrink-0">
                  {googleEmail[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-800">Signed in as</p>
                <p className="text-sm text-emerald-700 truncate">{googleEmail}</p>
              </div>
              <span className="text-emerald-500 text-lg flex-shrink-0">✓</span>
            </div>
          )}

          {/* Photo */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Profile photo</p>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--pl-teal)] transition-colors overflow-hidden flex-shrink-0 bg-slate-50"
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                ) : uploading ? (
                  <span className="text-sm text-slate-400">…</span>
                ) : (
                  <>
                    <span className="text-2xl mb-0.5">📷</span>
                    <span className="text-[10px] font-medium text-slate-400">Add photo</span>
                  </>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">Profile photo</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Recommended — providers with photos get 3× more contacts.
                </p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
          </div>

          {/* Basic info */}
          <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Basic info</p>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700">Your full name *</label>
              <input
                required
                autoFocus
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
                placeholder="Ravi Kumar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700">
                Business / clinic name <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                value={form.business_name}
                onChange={e => setForm({ ...form, business_name: e.target.value })}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
                placeholder="e.g. Happy Paws Clinic"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700">WhatsApp number *</label>
              <div className="flex items-center border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[var(--pl-teal)] bg-white gap-2">
                <span className="text-sm text-slate-400 font-medium">+91</span>
                <input
                  required
                  type="tel"
                  value={form.whatsapp}
                  onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                  className="flex-1 text-sm outline-none bg-transparent"
                  placeholder="98765 43210"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Pet owners will reach you here. Shown on your profile.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700">
                Phone number <span className="text-slate-400 font-normal">(optional — if different from WhatsApp)</span>
              </label>
              <div className="flex items-center border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[var(--pl-teal)] bg-white gap-2">
                <span className="text-sm text-slate-400 font-medium">+91</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="flex-1 text-sm outline-none bg-transparent"
                  placeholder="98765 43210"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">About you</p>
            <textarea
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              rows={4}
              maxLength={800}
              placeholder="Tell pet owners about your experience, qualifications, and what makes you stand out…"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{form.bio.length}/800</p>
          </div>

          <button
            type="button"
            disabled={!canNext1}
            onClick={() => setStep(2)}
            className="w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
            style={{
              background: canNext1 ? 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)' : '#F1F5F9',
              color: canNext1 ? '#451A03' : '#94A3B8',
              boxShadow: canNext1 ? '0 4px 0px rgba(120,53,15,0.28)' : 'none',
            }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── Step 2: Services ── */}
      {step === 2 && (
        <div className="flex flex-col gap-5">

          {/* Services */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Services offered * <span className="font-normal text-slate-400 normal-case tracking-normal">(select all that apply)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {SERVICE_CATEGORIES.map(c => {
                const selected = form.category_slugs.includes(c.slug)
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => toggleCategory(c.slug)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-medium border transition-all ${
                      selected ? 'text-white border-transparent' : 'bg-white text-foreground border-border hover:border-[var(--pl-teal)]'
                    }`}
                    style={selected ? { backgroundColor: 'var(--pl-teal)' } : {}}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                    {selected && <span className="text-xs opacity-80">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 24hr Emergency — only if vet selected */}
          {hasVet && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-800">24hr / Emergency clinic?</p>
                  <p className="text-xs text-red-600 mt-0.5">Toggle on if you handle emergencies outside regular hours.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, is_emergency: !prev.is_emergency }))}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                    form.is_emergency ? 'bg-red-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={form.is_emergency}
                >
                  <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${
                    form.is_emergency ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          )}

          {/* Area */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Service area *</p>
            <select
              required
              value={form.area}
              onChange={e => setForm({ ...form, area: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
            >
              <option value="">Select your area</option>
              {MUMBAI_AREAS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Pricing */}
          <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Pricing <span className="font-normal normal-case tracking-normal text-slate-400">(optional — you can add this later)</span></p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Min price (₹)</label>
                <input
                  type="number"
                  value={form.price_min}
                  onChange={e => setForm({ ...form, price_min: e.target.value })}
                  placeholder="e.g. 300"
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Max price (₹)</label>
                <input
                  type="number"
                  value={form.price_max}
                  onChange={e => setForm({ ...form, price_max: e.target.value })}
                  placeholder="e.g. 600"
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Price unit</label>
              <select
                value={form.price_unit}
                onChange={e => setForm({ ...form, price_unit: e.target.value })}
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                {PRICE_UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Hours */}
          <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Availability <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Opens at</label>
                <input
                  type="time"
                  value={form.hours_from}
                  onChange={e => setForm({ ...form, hours_from: e.target.value })}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Closes at</label>
                <input
                  type="time"
                  value={form.hours_to}
                  onChange={e => setForm({ ...form, hours_to: e.target.value })}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Working days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={
                      form.working_days.includes(day)
                        ? { background: '#FCD34D', color: '#451A03', borderColor: '#F59E0B' }
                        : { background: 'white', color: '#64748B', borderColor: '#E2E8F0' }
                    }
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trust note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              📋 <strong>What happens next:</strong> We review your application within 24 hours. Once approved, you'll get an email and can access your dashboard immediately at <strong>pawlocal.in/dashboard</strong>.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-4 rounded-2xl font-semibold text-sm border border-border text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="flex-1 py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
              style={{
                background: canSubmit ? 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)' : '#F1F5F9',
                color: canSubmit ? '#451A03' : '#94A3B8',
                boxShadow: canSubmit ? '0 4px 0px rgba(120,53,15,0.28)' : 'none',
              }}
            >
              {submitting ? 'Submitting…' : "Submit — it's free 🐾"}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-center text-slate-400 mt-6">
        Already listed?{' '}
        <a href="/my-listing" className="underline hover:text-slate-600">Access your dashboard →</a>
      </p>
    </div>
  )
}
