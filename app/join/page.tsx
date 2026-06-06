'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/categories'
import GoogleSignInButton from '@/components/GoogleSignInButton'

// Insurance is an affiliate page — providers can't list there
const SERVICE_CATEGORIES = CATEGORIES.filter((c) => c.slug !== 'insurance')

const MUMBAI_AREAS = [
  'Juhu', 'Andheri West', 'Andheri East', 'Bandra', 'Khar',
  'Santacruz', 'Vile Parle', 'Versova', 'JVLR', 'Lokhandwala',
  'Oshiwara', 'DN Nagar', 'Goregaon West', 'Malad West',
]

const STEPS = ['Sign in', 'Who are you?', 'What you offer', 'Done!']

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

  const [form, setForm] = useState({
    name: '',
    whatsapp: '',
    area: '',
    category_slugs: [] as string[],
  })

  // On mount: check if already signed in (e.g. returning from OAuth)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata ?? {}
        const name = meta.full_name ?? meta.name ?? ''
        setGoogleName(name)
        setGoogleEmail(data.user.email ?? '')
        setGoogleAvatar(meta.avatar_url ?? meta.picture ?? null)
        // Pre-fill name from Google
        setForm(prev => ({ ...prev, name: prev.name || name }))
        // Skip the sign-in step — they're already signed in
        setStep(prev => prev === 0 ? 1 : prev)
      }
      setAuthChecked(true)
    })
  }, [])

  function toggleCategory(slug: string) {
    setForm(prev => {
      const has = prev.category_slugs.includes(slug)
      return {
        ...prev,
        category_slugs: has
          ? prev.category_slugs.filter(s => s !== slug)
          : [...prev.category_slugs, slug],
      }
    })
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
        name: form.name,
        whatsapp: form.whatsapp,
        category_slug: form.category_slugs[0],
        category_slugs: form.category_slugs,
        area: form.area,
        address: form.area + ', Mumbai',
        photo_urls: photoUrl ? [photoUrl] : [],
        price_min: null,
        price_max: null,
        bio: null,
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

  const canNext1 = form.name.trim().length >= 2 && form.whatsapp.replace(/\D/g, '').length >= 10
  const canNext2 = form.category_slugs.length > 0 && form.area.length > 0
  const canSubmit = canNext1 && canNext2

  // Show nothing until we've checked auth (avoids flash of sign-in screen)
  if (!authChecked) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 flex justify-center">
        <div className="w-6 h-6 border-2 border-[var(--pl-teal)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4 pb-20">

      {/* Header */}
      <div className="mb-8">
        {/* Progress steps — skip step 0 in display once signed in */}
        <div className="flex items-center gap-2 mb-5">
          {STEPS.slice(1).map((s, i) => {
            const realStep = i + 1 // steps 1, 2, 3
            return (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > realStep ? 'bg-emerald-500 text-white' :
                    step === realStep ? 'bg-[var(--pl-teal)] text-white' :
                    'bg-slate-100 text-slate-400'
                  }`}
                >
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

        {step === 0 && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">List your services free</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in with Google first — takes 10 seconds.</p>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Tell us about yourself</h1>
            <p className="text-sm text-slate-500 mt-1">Takes 2 minutes. Free forever. We review and call you within 24 hours.</p>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">What do you offer?</h1>
            <p className="text-sm text-slate-500 mt-1">Select your services and area. You'll complete your full profile after approval.</p>
          </>
        )}
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-5">
          {submitError}
        </div>
      )}

      {/* Step 0 — Google sign-in */}
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

      {/* Step 1 — Identity */}
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
                Optional but recommended — providers with photos get 3× more contacts.
              </p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700">Your name *</label>
            <input
              required
              autoFocus
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
              placeholder="Ravi Kumar"
            />
          </div>

          {/* WhatsApp */}
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
            <p className="text-xs text-slate-400 mt-1.5">Pet owners will reach you here. Shown on your profile.</p>
          </div>

          <button
            type="button"
            disabled={!canNext1}
            onClick={() => setStep(2)}
            className="w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 mt-2"
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

      {/* Step 2 — Services + Area */}
      {step === 2 && (
        <div className="flex flex-col gap-5">

          {/* Service type */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700">
              What services do you offer? * <span className="text-muted-foreground font-normal">(select all that apply)</span>
            </label>
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

          {/* Area */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700">Your area *</label>
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
    </div>
  )
}
