'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProviderWithPhotos } from '@/lib/supabase/types'
import type { CategoryConfig } from '@/lib/categories'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SETUP_STEPS = [
  { key: 'photo',    label: 'Profile photo', icon: '📷', tip: 'Providers with photos get 3× more contacts' },
  { key: 'bio',      label: 'About you',     icon: '✍️',  tip: 'Tell pet owners why they should trust you' },
  { key: 'pricing',  label: 'Pricing',       icon: '💰',  tip: '70% of pet owners filter by price first' },
]

export default function EditProviderClient({
  provider,
  category,
  setupMode = false,
}: {
  provider: ProviderWithPhotos
  category: CategoryConfig
  setupMode?: boolean
}) {
  const router = useRouter()
  const [setupStep, setSetupStep] = useState(0) // only used in setupMode
  const [setupDone, setSetupDone] = useState(false)

  // ── Edit form state ──────────────────────────────────────────
  const [priceMin, setPriceMin]     = useState(provider.price_min?.toString() ?? '')
  const [priceMax, setPriceMax]     = useState(provider.price_max?.toString() ?? '')
  const [priceUnit, setPriceUnit]   = useState(provider.price_unit ?? 'per session')
  const [bio, setBio]               = useState(provider.bio ?? '')
  const [hoursFrom, setHoursFrom]   = useState(provider.hours_from ?? '09:00')
  const [hoursTo, setHoursTo]       = useState(provider.hours_to ?? '18:00')
  const [workingDays, setWorkingDays] = useState<string[]>(provider.working_days ?? [])
  const [phone, setPhone]           = useState(provider.phone ?? '')

  // ── Photo state ─────────────────────────────────────────────────
  const [photos, setPhotos] = useState(provider.provider_photos ?? [])
  const [uploading, setUploading] = useState(false)
  const [photoErr, setPhotoErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving]   = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [saved, setSaved]     = useState(false)

  // ── Save step ────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveErr('')

    const res = await fetch('/api/provider/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: provider.id,
        updates: {
          price_min:    priceMin ? Number(priceMin) : null,
          price_max:    priceMax ? Number(priceMax) : null,
          price_unit:   priceUnit,
          bio,
          hours_from:   hoursFrom,
          hours_to:     hoursTo,
          working_days: workingDays,
          phone:        phone || null,
        },
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setSaveErr(json.error ?? 'Could not save changes')
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => router.push(`/provider/${provider.id}`), 1200)
  }

  // ── Photo upload ─────────────────────────────────────────────────
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - photos.length)
    if (!files.length) return
    setUploading(true)
    setPhotoErr('')
    const supabase = createClient()
    const newPhotos = [...photos]
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('provider-photos').upload(path, file)
      if (error) { setPhotoErr('Upload failed — try again'); continue }
      const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
      // Insert photo row
      const { data: photoRow } = await supabase
        .from('provider_photos')
        .insert({ provider_id: provider.id, url: data.publicUrl, is_primary: newPhotos.length === 0, sort_order: newPhotos.length })
        .select()
        .single()
      if (photoRow) newPhotos.push(photoRow as typeof newPhotos[0])
    }
    setPhotos(newPhotos)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleRemovePhoto(photoId: string) {
    const supabase = createClient()
    await supabase.from('provider_photos').delete().eq('id', photoId)
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
  }

  function toggleDay(day: string) {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // ── Render: setup wizard (shown after claiming) ──────────────
  if (setupMode && !setupDone) {
    const profileUrl = `https://pupstep.in/provider/${provider.id}`
    const waShareUrl = `https://wa.me/?text=${encodeURIComponent(
      `Hi! I just listed my ${category.name.toLowerCase()} services on PupStep 🐾\nCheck my profile: ${profileUrl}`
    )}`

    if (setupStep === SETUP_STEPS.length) {
      // Done screen — share your profile
      return (
        <div className="max-w-md mx-auto py-14 px-4 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">You're all set!</h1>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Your profile is live on PupStep. Share it on WhatsApp — your first customer is one message away.
          </p>

          {/* Profile link */}
          <div className="bg-white border border-border rounded-2xl p-5 mb-5 text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Your profile link</p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3">
              <a
                href={`/provider/${provider.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[var(--pl-teal)] underline underline-offset-2 flex-1 truncate"
              >
                pupstep.in/provider/{provider.id.slice(0, 8)}…
              </a>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(profileUrl).then(() => alert('Link copied!'))}
                className="text-xs text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
              >
                📋 Copy
              </button>
            </div>
          </div>

          {/* Share CTA */}
          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white rounded-2xl py-4 font-bold text-sm mb-4 transition-colors"
          >
            💬 Share on WhatsApp
          </a>

          <button
            type="button"
            onClick={() => router.push(`/provider/${provider.id}/dashboard`)}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm border border-border text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Go to my dashboard →
          </button>
        </div>
      )
    }

    const currentStep = SETUP_STEPS[setupStep]

    return (
      <div className="max-w-md mx-auto py-10 px-4">

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {SETUP_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < setupStep ? 'bg-emerald-500 text-white' :
                  i === setupStep ? 'bg-[var(--pl-teal)] text-white' :
                  'bg-slate-100 text-slate-400'
                }`}
              >
                {i < setupStep ? '✓' : s.icon}
              </div>
              {i < SETUP_STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < setupStep ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
          <span className="ml-auto text-xs text-slate-400">{setupStep + 1} of {SETUP_STEPS.length}</span>
        </div>

        <div className="mb-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--pl-teal)]">Setup</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{currentStep.label}</h1>
        <p className="text-sm text-slate-500 mb-7">💡 {currentStep.tip}</p>

        {/* Step: Photo */}
        {setupStep === 0 && (
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-border rounded-2xl p-5">
              <div className="flex gap-3 flex-wrap mb-4">
                {photos.map((photo, i) => (
                  <div key={photo.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 font-semibold">Profile</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] hidden group-hover:flex items-center justify-center"
                    >✕</button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-slate-400 hover:border-[var(--pl-teal)] hover:text-[var(--pl-teal)] transition-colors gap-1"
                  >
                    <span className="text-2xl">{uploading ? '…' : '+'}</span>
                    <span className="text-[10px] font-medium">Add photo</span>
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              {photoErr && <p className="text-xs text-red-500">{photoErr}</p>}
            </div>
            <div className="flex gap-3">
              {photos.length === 0 && (
                <button
                  type="button"
                  onClick={() => setSetupStep(s => s + 1)}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-medium text-slate-500 border border-border hover:bg-slate-50 transition-colors"
                >
                  Skip for now
                </button>
              )}
              <button
                type="button"
                onClick={() => setSetupStep(s => s + 1)}
                disabled={uploading}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all"
                style={{
                  background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
                  color: '#451A03',
                  boxShadow: '0 4px 0px rgba(120,53,15,0.28)',
                }}
              >
                {photos.length > 0 ? 'Continue →' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Bio */}
        {setupStep === 1 && (
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-border rounded-2xl p-5">
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={5}
                placeholder={`E.g. "I've been walking dogs in ${category.name === 'Dog Walking' ? 'Juhu' : 'Mumbai'} for 3 years. I treat every pet like my own — gentle, reliable, and always on time."`}
                maxLength={800}
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p className="text-xs text-slate-400 mt-1.5 text-right">{bio.length}/800</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSetupStep(s => s - 1)} className="px-5 py-3.5 rounded-2xl text-sm border border-border text-slate-600 hover:bg-slate-50 transition-colors">← Back</button>
              <button
                type="button"
                onClick={() => setSetupStep(s => s + 1)}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all"
                style={{ background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)', color: '#451A03', boxShadow: '0 4px 0px rgba(120,53,15,0.28)' }}
              >
                {bio.trim() ? 'Continue →' : 'Skip for now →'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Pricing */}
        {setupStep === 2 && (
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Min price (₹)</label>
                  <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="300" className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Max price (₹)</label>
                  <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="600" className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Price unit</label>
                <select value={priceUnit} onChange={e => setPriceUnit(e.target.value)} className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                  <option>per session</option>
                  <option>per hour</option>
                  <option>per visit</option>
                  <option>per month</option>
                  <option>per day</option>
                  <option>per grooming</option>
                  <option>per consultation</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSetupStep(s => s - 1)} className="px-5 py-3.5 rounded-2xl text-sm border border-border text-slate-600 hover:bg-slate-50 transition-colors">← Back</button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true)
                  const res = await fetch('/api/provider/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: provider.id,
                      updates: {
                        bio: bio.trim() || null,
                        price_min: priceMin ? Number(priceMin) : null,
                        price_max: priceMax ? Number(priceMax) : null,
                        price_unit: priceUnit,
                      },
                    }),
                  })
                  setSaving(false)
                  if (res.ok) {
                    setSetupStep(SETUP_STEPS.length) // done screen
                  } else {
                    const json = await res.json()
                    setSaveErr(json.error ?? 'Could not save')
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)', color: '#451A03', boxShadow: '0 4px 0px rgba(120,53,15,0.28)' }}
              >
                {saving ? 'Saving…' : 'Save & finish 🎉'}
              </button>
            </div>
            {saveErr && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{saveErr}</p>}
          </div>
        )}
      </div>
    )
  }

  // ── Render: edit form ────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <a
        href={`/provider/${provider.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        ← Back to listing
      </a>

      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: category.color + '18' }}
        >
          {category.icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{provider.name}</h1>
          <p className="text-sm text-slate-400">{category.name} · edit listing</p>
        </div>
        <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
          ✓ Verified
        </span>
      </div>

      {/* Profile link — so provider can copy & share */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6">
        <span className="text-xs text-slate-500 shrink-0">Your profile:</span>
        <a
          href={`/provider/${provider.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[var(--pl-teal)] underline underline-offset-2 truncate"
        >
          pupstep.in/provider/{provider.id.slice(0, 8)}…
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(`https://pupstep.in/provider/${provider.id}`)
              .then(() => alert('Profile link copied!'))
          }}
          className="ml-auto text-xs text-slate-400 hover:text-slate-700 shrink-0 transition-colors"
        >
          Copy 📋
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 mb-6 text-sm font-medium">
          ✓ Changes saved! Redirecting…
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        {/* Pricing */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Pricing</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Min price (₹)</label>
              <input
                type="number"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                placeholder="e.g. 300"
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Max price (₹)</label>
              <input
                type="number"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                placeholder="e.g. 600"
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Price unit</label>
            <select
              value={priceUnit}
              onChange={e => setPriceUnit(e.target.value)}
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              <option>per session</option>
              <option>per hour</option>
              <option>per visit</option>
              <option>per month</option>
              <option>per day</option>
              <option>per grooming</option>
              <option>per consultation</option>
            </select>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">About you</p>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={4}
            placeholder="Describe your services, experience, and what makes you stand out…"
            maxLength={800}
            className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <p className="text-xs text-slate-400 mt-1.5 text-right">{bio.length}/800</p>
        </div>

        {/* Hours */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Availability</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Opens at</label>
              <input
                type="time"
                value={hoursFrom}
                onChange={e => setHoursFrom(e.target.value)}
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Closes at</label>
              <input
                type="time"
                value={hoursTo}
                onChange={e => setHoursTo(e.target.value)}
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
                    workingDays.includes(day)
                      ? { background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)', color: '#fff', borderColor: '#F56B22' }
                      : { background: 'white', color: '#64748B', borderColor: '#E2E8F0' }
                  }
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Contact (optional)</p>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Photos</p>
          <p className="text-xs text-slate-500 mb-3">Up to 3 photos · First photo is your profile picture</p>
          <div className="flex gap-3 flex-wrap mb-3">
            {photos.map((photo, i) => (
              <div key={photo.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border group">
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 font-semibold">
                    Profile
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] items-center justify-center hidden group-hover:flex transition-all"
                >
                  ✕
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-slate-400 hover:border-[var(--pl-teal)] hover:text-[var(--pl-teal)] transition-colors gap-1"
              >
                <span className="text-xl">{uploading ? '…' : '+'}</span>
                <span className="text-[10px] font-medium">Add photo</span>
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
          {photoErr && <p className="text-xs text-red-500">{photoErr}</p>}
        </div>

        {saveErr && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{saveErr}</p>
        )}

        <button
          type="submit"
          disabled={saving || saved}
          className="w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-60"
          style={{
            background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
            color: '#451A03',
            boxShadow: '0 4px 0px rgba(120,53,15,0.28), 0 8px 20px rgba(252,211,77,0.4)',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
