'use client'

import { useState } from 'react'
import type { ProviderWithPhotos } from '@/lib/supabase/types'

type Props = {
  provider: ProviderWithPhotos
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PRICE_UNITS = ['per session', 'per hour', 'per day', 'per month']

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2.5 border-b border-stone-100 last:border-0">
      <span className="text-xs text-muted-foreground w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-stone-800 flex-1">{value}</span>
    </div>
  )
}

export default function ProProfileClient({ provider }: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
  })

  function toggleDay(day: string) {
    setForm(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }))
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
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Success banner */}
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium px-4 py-3 rounded-xl">
            ✓ Profile updated!
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

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('edit')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[var(--pl-teal)] text-[var(--pl-teal)] text-sm font-bold hover:bg-teal-50 transition-colors"
          >
            ✏️ Edit profile
          </button>
          <a
            href={`/provider/${provider.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
          >
            🔗 Public view
          </a>
        </div>

        <div className="pb-24" />
      </div>
    )
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Edit Profile
        </h1>
        <button
          onClick={() => setMode('view')}
          className="text-sm text-muted-foreground hover:text-stone-900 transition-colors"
        >
          Cancel
        </button>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {saveError}
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Basic Info</p>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Full name <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Business / Clinic name</label>
          <input
            type="text"
            value={form.business_name}
            onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))}
            placeholder="Optional"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Bio <span className="text-xs text-muted-foreground">({form.bio.length}/300)</span></label>
          <textarea
            rows={3}
            maxLength={300}
            value={form.bio}
            onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
            placeholder="Tell pet owners about yourself…"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contact</p>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">WhatsApp number <span className="text-red-500">*</span></label>
          <input
            type="tel"
            required
            value={form.whatsapp}
            onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Phone (optional)</label>
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
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Min ₹</label>
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
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Max ₹</label>
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
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Per</label>
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
            <label className="block text-sm font-medium text-stone-700 mb-1.5">From</label>
            <input
              type="time"
              value={form.hours_from}
              onChange={e => setForm(p => ({ ...p, hours_from: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">To</label>
            <input
              type="time"
              value={form.hours_to}
              onChange={e => setForm(p => ({ ...p, hours_to: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Working days</label>
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
            Saving…
          </span>
        ) : 'Save changes'}
      </button>

      <div className="pb-24" />
    </div>
  )
}
