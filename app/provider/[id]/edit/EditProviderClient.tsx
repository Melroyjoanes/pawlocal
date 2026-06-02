'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProviderWithPhotos } from '@/lib/supabase/types'
import type { CategoryConfig } from '@/lib/categories'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function EditProviderClient({
  provider,
  category,
}: {
  provider: ProviderWithPhotos
  category: CategoryConfig
}) {
  const router = useRouter()

  // ── Step 1: verify WhatsApp ──────────────────────────────────
  const [verified, setVerified] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [verifyErr, setVerifyErr] = useState('')
  const [verifying, setVerifying] = useState(false)

  // ── Step 2: edit form state ──────────────────────────────────
  const [priceMin, setPriceMin]     = useState(provider.price_min?.toString() ?? '')
  const [priceMax, setPriceMax]     = useState(provider.price_max?.toString() ?? '')
  const [priceUnit, setPriceUnit]   = useState(provider.price_unit ?? 'per session')
  const [bio, setBio]               = useState(provider.bio ?? '')
  const [hoursFrom, setHoursFrom]   = useState(provider.hours_from ?? '09:00')
  const [hoursTo, setHoursTo]       = useState(provider.hours_to ?? '18:00')
  const [workingDays, setWorkingDays] = useState<string[]>(provider.working_days ?? [])
  const [phone, setPhone]           = useState(provider.phone ?? '')

  const [saving, setSaving]   = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [saved, setSaved]     = useState(false)

  // ── Verify step ──────────────────────────────────────────────
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    setVerifyErr('')

    // Quick client-side pre-check (actual check happens server-side)
    const input = whatsapp.replace(/\D/g, '').replace(/^91/, '')
    if (input.length < 10) {
      setVerifyErr('Enter your 10-digit WhatsApp number')
      setVerifying(false)
      return
    }

    // Dry-run: try updating with no changes just to verify
    const res = await fetch('/api/provider/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: provider.id, whatsapp, updates: {} }),
    })
    const json = await res.json()

    if (!res.ok) {
      setVerifyErr(json.error ?? 'Verification failed')
      setVerifying(false)
      return
    }

    setVerified(true)
    setVerifying(false)
  }

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
        whatsapp,
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

  function toggleDay(day: string) {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // ── Render: verify step ──────────────────────────────────────
  if (!verified) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <a
          href={`/provider/${provider.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          ← Back to listing
        </a>

        <div className="bg-white border border-border rounded-2xl p-7 shadow-sm">
          {/* Header */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5"
            style={{ backgroundColor: category.color + '18' }}
          >
            {category.icon}
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Edit your listing</h1>
          <p className="text-sm text-slate-500 mb-7">
            Enter the WhatsApp number you registered with to verify it's you.
          </p>

          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Your WhatsApp number
              </label>
              <div className="flex items-center gap-2 border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-amber-400 bg-white">
                <span className="text-sm text-slate-400 font-medium">+91</span>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="98765 43210"
                  className="flex-1 text-sm outline-none bg-transparent"
                  required
                />
              </div>
            </div>

            {verifyErr && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{verifyErr}</p>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
                color: '#451A03',
                boxShadow: '0 4px 0px rgba(120,53,15,0.28)',
              }}
            >
              {verifying ? 'Verifying…' : 'Verify & Edit →'}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-400 text-center mt-5">
          Only the registered provider can edit this listing.
        </p>
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

      <div className="flex items-center gap-3 mb-7">
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

        {saveErr && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{saveErr}</p>
        )}

        <button
          type="submit"
          disabled={saving || saved}
          className="w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-60"
          style={{
            background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
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
