'use client'

import { useEffect, useState } from 'react'
import type { ProviderWithPhotos, Review } from '@/lib/supabase/types'
import { getCategoryBySlug } from '@/lib/categories'
import { Stars } from '@/components/StarRating'

type ProviderStatus = 'pending' | 'approved' | 'rejected'
type AdminTab = 'providers' | 'broadcasts' | 'reports' | 'grooming' | 'reviews' | 'stats' | 'care'

// ── Care System interfaces ────────────────────────────────────────
interface CareStats {
  total_dogs: number
  total_connections: number
  active_connections: number
  pending_connections: number
  total_walk_logs: number
}
interface CareConnection {
  id: string
  dog_name: string
  walker_name: string | null
  walker_phone: string | null
  walker_role: string | null
  status: string
  claimed_at: string | null
  created_at: string
}
interface CareWalkLog {
  id: string
  dog_name: string
  walker_name: string | null
  duration_mins: number | null
  poop_count: number
  pee_count: number
  mood: string | null
  created_at: string
}

interface Broadcast {
  id: string
  service_slug: string
  pet_description: string
  area: string
  date_needed: string
  budget: string | null
  poster_name: string
  poster_whatsapp: string
  notes: string | null
  status: string
  created_at: string
  expires_at: string
}

interface WalkReport {
  id: string
  token: string
  dog_name: string
  walk_date: string
  duration_mins: number
  distance_meters: number | null
  poop_count: number
  pee_count: number
  photo_url: string | null
  customer_id: string | null
  customer: { email: string; name: string | null } | null
  created_at: string
  provider_id: string
  providers: {
    id: string
    name: string
    whatsapp: string
    category_slug: string
  } | null
  view_count: number
  hook_tapped: boolean
}

interface GroomingReport {
  id: string
  token: string
  dog_name: string
  grooming_date: string
  duration_mins: number
  services_done: string[]
  ticks_found: number
  skin_condition: string
  ear_condition: string
  nail_condition: string
  coat_condition: string
  behavior: string
  before_photo_url: string | null
  after_photo_url: string | null
  notes: string | null
  created_at: string
  providers: {
    id: string
    name: string
    whatsapp: string
    category_slug: string
  } | null
}

const SERVICE_LABELS: Record<string, { label: string; icon: string }> = {
  'dog-walking': { label: 'Dog Walking', icon: '🦮' },
  grooming: { label: 'Grooming', icon: '✂️' },
  vet: { label: 'Vet', icon: '🏥' },
  'pet-store': { label: 'Pet Store', icon: '🛍️' },
  'dog-training': { label: 'Dog Training', icon: '🎯' },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() < Date.now()
}

function fmtDistance(meters: number | null) {
  if (!meters) return '—'
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

// ── Tier badge ───────────────────────────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  if (tier === 'certified')
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">🏅 Certified</span>
  if (tier === 'verified')
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">✓ Verified</span>
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Listed</span>
}

// ── Edit Provider Modal ───────────────────────────────────────────
const CATEGORY_OPTIONS = [
  { value: 'dog-walking', label: '🦮 Dog Walking' },
  { value: 'grooming', label: '✂️ Grooming' },
  { value: 'veterinary', label: '🏥 Veterinary' },
  { value: 'pet-store', label: '🛒 Pet Store' },
  { value: 'dog-training', label: '🎓 Dog Training' },
  { value: 'pet-boarding', label: '🏠 Pet Boarding' },
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PRICE_UNITS = ['/walk', '/session', '/month', '/visit', '/hour', '/night']

function EditProviderModal({
  provider,
  onClose,
}: {
  provider: ProviderWithPhotos
  onClose: (updated?: Partial<ProviderWithPhotos>) => void
}) {
  const p = provider as ProviderWithPhotos & { email?: string }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(p.name ?? '')
  const [businessName, setBusinessName] = useState(p.business_name ?? '')
  const [email, setEmail] = useState(p.email ?? '')
  const [whatsapp, setWhatsapp] = useState(p.whatsapp ?? '')
  const [phone, setPhone] = useState(p.phone ?? '')
  const [bio, setBio] = useState(p.bio ?? '')
  const [address, setAddress] = useState(p.address ?? '')
  const [neighbourhood, setNeighbourhood] = useState(p.neighbourhood ?? '')
  const [categorySlug, setCategorySlug] = useState<string>(p.category_slug ?? 'dog-walking')
  const [categorySlugs, setCategorySlugs] = useState<string[]>(p.category_slugs ?? [])
  type ServicePrice = { min: string; max: string; unit: string }
  const initialPrices: Record<string, ServicePrice> = {}
  const existingPrices = (p as ProviderWithPhotos & { service_prices?: Record<string, { min: number | null; max: number | null; unit: string }> }).service_prices ?? {}
  for (const [slug, val] of Object.entries(existingPrices)) {
    initialPrices[slug] = { min: val.min != null ? String(val.min) : '', max: val.max != null ? String(val.max) : '', unit: val.unit ?? '/session' }
  }
  const [servicePrices, setServicePrices] = useState<Record<string, ServicePrice>>(initialPrices)

  function updateServicePrice(slug: string, field: keyof ServicePrice, value: string) {
    setServicePrices(prev => ({ ...prev, [slug]: { ...prev[slug] ?? { min: '', max: '', unit: '/session' }, [field]: value } }))
  }
  const [hoursFrom, setHoursFrom] = useState(p.hours_from ?? '06:00')
  const [hoursTo, setHoursTo] = useState(p.hours_to ?? '20:00')
  const [workingDays, setWorkingDays] = useState<string[]>(p.working_days ?? [])

  function toggleCategorySlug(slug: string) {
    setCategorySlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  function toggleDay(day: string) {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/providers/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, business_name: businessName, email, whatsapp, phone, bio,
          address, neighbourhood, category_slug: categorySlug,
          category_slugs: categorySlugs,
          hours_from: hoursFrom, hours_to: hoursTo,
          working_days: workingDays,
          service_prices: Object.fromEntries(
            Object.entries(servicePrices).map(([slug, v]) => [slug, {
              min: v.min !== '' ? Number(v.min) : null,
              max: v.max !== '' ? Number(v.max) : null,
              unit: v.unit,
            }])
          ),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      onClose({
        name, business_name: businessName || null,
        email: email || undefined, whatsapp, phone: phone || null, bio: bio || null,
        address, neighbourhood, category_slug: categorySlug as never,
        category_slugs: categorySlugs,
        hours_from: hoursFrom, hours_to: hoursTo,
        working_days: workingDays,
        service_prices: Object.fromEntries(
          Object.entries(servicePrices).map(([slug, v]) => [slug, {
            min: v.min !== '' ? Number(v.min) : null,
            max: v.max !== '' ? Number(v.max) : null,
            unit: v.unit,
          }])
        ),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'
  const sectionCls = 'border-t border-slate-100 pt-4'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92dvh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-900">Edit Provider</h2>
            <p className="text-xs text-slate-400">{p.name}</p>
          </div>
          <button onClick={() => onClose()} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors text-lg">✕</button>
        </div>

        {/* Scrollable fields */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Business Name (optional)</label>
              <input className={inputCls} value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Happy Paws Grooming" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Bio</label>
              <textarea className={inputCls} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Short description shown on their profile…" />
            </div>
          </div>

          {/* Contact */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Email</label>
                <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="used for dashboard login" />
              </div>
              <div>
                <label className={labelCls}>WhatsApp</label>
                <input className={inputCls} type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="9876543210" />
              </div>
              <div>
                <label className={labelCls}>Phone (optional)</label>
                <input className={inputCls} type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Location</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Address</label>
                <input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Neighbourhood</label>
                <input className={inputCls} value={neighbourhood} onChange={e => setNeighbourhood(e.target.value)} placeholder="e.g. Juhu" />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Category</p>
            <div>
              <label className={labelCls}>Primary Category</label>
              <select className={inputCls} value={categorySlug} onChange={e => setCategorySlug(e.target.value)}>
                {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="mt-3">
              <label className={labelCls}>Additional Categories</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CATEGORY_OPTIONS.map(c => (
                  <button key={c.value} type="button"
                    onClick={() => toggleCategorySlug(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      categorySlugs.includes(c.value)
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing — per service */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pricing</p>
            <p className="text-xs text-slate-400 mb-3">Set different prices per service</p>
            {[categorySlug, ...categorySlugs.filter(s => s !== categorySlug)].map(slug => {
              const cat = CATEGORY_OPTIONS.find(c => c.value === slug)
              if (!cat) return null
              const sp = servicePrices[slug] ?? { min: '', max: '', unit: '/session' }
              return (
                <div key={slug} className="mb-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2">{cat.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Min ₹</label>
                      <input className={inputCls} type="number" value={sp.min} onChange={e => updateServicePrice(slug, 'min', e.target.value)} placeholder="300" />
                    </div>
                    <div>
                      <label className={labelCls}>Max ₹</label>
                      <input className={inputCls} type="number" value={sp.max} onChange={e => updateServicePrice(slug, 'max', e.target.value)} placeholder="500" />
                    </div>
                    <div>
                      <label className={labelCls}>Per</label>
                      <select className={inputCls} value={sp.unit} onChange={e => updateServicePrice(slug, 'unit', e.target.value)}>
                        {PRICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Schedule */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Schedule</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>From</label>
                <input className={inputCls} type="time" value={hoursFrom} onChange={e => setHoursFrom(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>To</label>
                <input className={inputCls} type="time" value={hoursTo} onChange={e => setHoursTo(e.target.value)} />
              </div>
            </div>
            <label className={labelCls}>Working Days</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    workingDays.includes(d)
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">⚠️ {error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={() => onClose()} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Provider card ────────────────────────────────────────────────
function ProviderCard({
  p,
  filter,
  onStatusChange,
  onVerifiedChange,
  onTierChange,
  onCoordsSaved,
  onEdit,
}: {
  p: ProviderWithPhotos
  filter: ProviderStatus
  onStatusChange: (id: string, status: 'approved' | 'rejected') => void
  onVerifiedChange: (id: string, val: boolean) => void
  onTierChange: (id: string, tier: string) => void
  onCoordsSaved: (id: string, lat: number, lng: number) => void
  onEdit: (p: ProviderWithPhotos) => void
}) {
  const [showCoords, setShowCoords] = useState(false)
  const [lat, setLat] = useState(String(p.lat ?? ''))
  const [lng, setLng] = useState(String(p.lng ?? ''))
  const [savingCoords, setSavingCoords] = useState(false)
  const [coordSaved, setCoordSaved] = useState(false)

  const providerEmail = (p as unknown as { email?: string }).email ?? ''
  const [sendingAccess, setSendingAccess] = useState(false)
  const [accessSent, setAccessSent] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  void showCoords // suppress lint — kept for future use

  async function sendDashboardWhatsApp() {
    if (!providerEmail) {
      setAccessError('No email on record. Add one in Supabase first.')
      return
    }
    setSendingAccess(true)
    setAccessError(null)
    try {
      const res = await fetch(`/api/admin/providers/${p.id}/send-access-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: providerEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      const firstName = p.name.split(' ')[0]
      const waText = encodeURIComponent(
        `Hi ${firstName}! Your PupStep provider dashboard is ready 🐾\n\nClick this link to sign in and manage your profile, update availability, and see who contacted you:\n${data.magicLink}\n\n(Link expires in 1 hour. Next time just go to pupstep.in/pro)`
      )
      const digits = p.whatsapp.replace(/\D/g, '').slice(-10)
      window.open(`https://wa.me/91${digits}?text=${waText}`, '_blank', 'noopener,noreferrer')
      setAccessSent(true)
      setTimeout(() => setAccessSent(false), 5000)
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSendingAccess(false)
    }
  }

  const category = getCategoryBySlug(p.category_slug)
  const primaryPhoto = p.provider_photos?.find((ph) => ph.is_primary) ?? p.provider_photos?.[0]
  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in')}/provider/${p.id}`
  const waDigits = p.whatsapp?.replace(/\D/g, '').slice(-10) ?? ''
  const waDirectUrl = waDigits ? `https://wa.me/91${waDigits}` : null

  async function saveCoords() {
    setSavingCoords(true)
    await fetch(`/api/admin/providers/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: Number(lat), lng: Number(lng) }),
    })
    setSavingCoords(false)
    setCoordSaved(true)
    onCoordsSaved(p.id, Number(lat), Number(lng))
    setTimeout(() => setCoordSaved(false), 2000)
  }

  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 flex gap-3 items-start">
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center text-2xl">
          {primaryPhoto
            ? <img src={primaryPhoto.url} alt={p.name} className="w-full h-full object-cover" />
            : <span>{category?.icon ?? '🐾'}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900">{p.name}</p>
                {filter === 'approved' && <TierBadge tier={p.verification_tier ?? 'contacted'} />}
              </div>
              {p.business_name && <p className="text-xs text-slate-400">{p.business_name}</p>}
              <p className="text-xs text-slate-500 mt-0.5">
                {category?.icon} {category?.name} · {p.address}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 whitespace-nowrap">
              {timeAgo(p.created_at)}
            </span>
          </div>

          {p.bio && <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">{p.bio}</p>}

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
            <span>📱 {p.whatsapp}</span>
            {p.price_min && <span>₹{p.price_min}{p.price_max ? `–${p.price_max}` : ''} {p.price_unit}</span>}
            <span className="text-slate-300">📍 {p.lat?.toFixed(4)}, {p.lng?.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {filter === 'pending' && (
        <div className="border-t border-border px-4 py-3 flex gap-3">
          <button
            onClick={() => onStatusChange(p.id, 'approved')}
            className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors min-h-[44px]"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => onStatusChange(p.id, 'rejected')}
            className="px-4 py-3 rounded-xl text-red-500 text-sm font-medium border border-red-200 bg-red-50 hover:bg-red-100 transition-colors min-h-[44px]"
          >
            Reject
          </button>
        </div>
      )}

      {filter === 'approved' && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={sendDashboardWhatsApp}
              disabled={sendingAccess}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all min-h-[44px] disabled:opacity-60 ${
                accessSent
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[var(--pl-teal)] text-white hover:opacity-90'
              }`}
            >
              {sendingAccess ? '⏳ Generating…' : accessSent ? '✓ WhatsApp opened!' : '🔑 Send Dashboard'}
            </button>

            {waDirectUrl ? (
              <a
                href={waDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-xl bg-[#25D366] text-white flex items-center justify-center text-lg hover:bg-[#20b558] transition-colors min-h-[44px] flex-shrink-0"
                title="WhatsApp provider"
              >
                💬
              </a>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-300 flex items-center justify-center text-lg flex-shrink-0" title="No WhatsApp on record">
                💬
              </div>
            )}

            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-lg hover:bg-slate-200 transition-colors min-h-[44px] flex-shrink-0"
              title="View public profile"
            >
              👁
            </a>

            <button
              onClick={() => onEdit(p)}
              className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-lg hover:bg-slate-200 transition-colors min-h-[44px] flex-shrink-0"
              title="Edit provider"
            >
              ✏️
            </button>
          </div>

          <button
            onClick={() => setShowSettings((v) => !v)}
            className="w-full mt-2 py-2 text-xs text-slate-400 flex items-center justify-center gap-1 hover:text-slate-600 transition-colors"
          >
            ⚙️ Settings {showSettings ? '▲' : '▼'}
          </button>

          {showSettings && (
            <div className="mt-2 pt-3 border-t border-border space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tier</label>
                <select
                  value={p.verification_tier ?? 'contacted'}
                  onChange={(e) => onTierChange(p.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-white text-slate-700 hover:border-slate-400 cursor-pointer transition-colors"
                >
                  <option value="contacted">Listed</option>
                  <option value="verified">Verified</option>
                  <option value="certified">Certified</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Verified badge</span>
                <button
                  onClick={() => onVerifiedChange(p.id, !p.is_verified)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    p.is_verified ? 'bg-amber-400' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    p.is_verified ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Fix Map Pin</label>
                  <a
                    href={`https://maps.google.com/?q=${p.lat},${p.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[var(--pl-teal)] underline"
                  >
                    Open Maps ↗
                  </a>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[11px] text-slate-400 mb-1">Lat</label>
                    <input
                      type="text"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="19.1075"
                      className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] text-slate-400 mb-1">Lng</label>
                    <input
                      type="text"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="72.8263"
                      className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]"
                    />
                  </div>
                  <button
                    onClick={saveCoords}
                    disabled={savingCoords}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                      coordSaved
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--pl-teal)] text-white hover:opacity-90'
                    } disabled:opacity-50`}
                  >
                    {savingCoords ? 'Saving…' : coordSaved ? '✓ Saved' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {accessError && filter === 'approved' && (
        <div className="px-4 pb-3 border-t border-border pt-2">
          <p className="text-xs text-red-600">⚠️ {accessError}</p>
        </div>
      )}
    </div>
  )
}

// ── Broadcast card (admin view) ──────────────────────────────────
function BroadcastAdminCard({
  b,
  providers,
  onClose,
  onReopen,
}: {
  b: Broadcast
  providers: any[]
  onClose: (id: string) => void
  onReopen: (id: string) => void
}) {
  const svc = SERVICE_LABELS[b.service_slug] ?? { label: b.service_slug, icon: '🐾' }
  const expired = isExpired(b.expires_at)
  // Derive directly from prop — never use local state for this, parent owns the truth
  const isClosed = b.status === 'closed' || b.status === 'filled'
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)

  const waLink = `https://wa.me/91${b.poster_whatsapp.replace(/\D/g, '').slice(-10)}`
  const waText = encodeURIComponent(
    `Hi ${b.poster_name}! I saw your request on PupStep for ${svc.label}. Let me help connect you with the right provider. 🐾`
  )

  async function handleClose() {
    if (closing || isClosed) return
    setClosing(true)
    try {
      const res = await fetch(`/api/admin/broadcasts/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (res.ok) onClose(b.id)
    } finally {
      setClosing(false)
    }
  }

  async function handleReopen() {
    if (reopening) return
    setReopening(true)
    try {
      const res = await fetch(`/api/admin/broadcasts/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (res.ok) onReopen(b.id)
    } finally {
      setReopening(false)
    }
  }

  const matchingProviders = providers.filter((p) => {
    const slugs: string[] = Array.isArray(p.category_slugs)
      ? p.category_slugs
      : p.category_slug
        ? [p.category_slug]
        : []
    return slugs.includes(b.service_slug)
  }).slice(0, 4)

  function buildNotifyLink(prov: any) {
    const message = [
      `Hi ${prov.name}! 🐾 New ${svc.label} request on PupStep.`,
      ``,
      `Customer: ${b.poster_name} in ${b.area}`,
      `When: ${b.date_needed}`,
      `Pet: ${b.pet_description}`,
      b.budget ? `Budget: ${b.budget}` : null,
      ``,
      `Reply to them: wa.me/91${b.poster_whatsapp.replace(/\D/g, '').slice(-10)}`,
    ].filter(Boolean).join('\n')
    const phone = (prov.whatsapp ?? '').replace(/\D/g, '').slice(-10)
    if (phone.length < 10) return null
    return `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
  }

  // Status chip
  let statusChip = null
  if (isClosed) {
    statusChip = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Closed</span>
  } else if (expired) {
    statusChip = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Expired</span>
  } else {
    statusChip = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Active</span>
  }

  return (
    <div className={`bg-white border rounded-2xl p-4 ${(isClosed || expired) ? 'opacity-60 border-border' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{svc.icon}</span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{svc.label}</p>
            <p className="text-xs text-slate-400">{b.area} · {timeAgo(b.created_at)}</p>
          </div>
        </div>
        {statusChip}
      </div>

      <div className="space-y-0.5 mb-3">
        <p className="text-sm text-slate-700">
          <span className="text-slate-400">From: </span>
          <span className="font-medium">{b.poster_name}</span>
          <span className="text-slate-400"> · </span>
          <span className="font-mono text-xs">{b.poster_whatsapp}</span>
        </p>
        <p className="text-sm text-slate-700">
          <span className="text-slate-400">Pet: </span>{b.pet_description}
        </p>
        <p className="text-sm text-slate-700">
          <span className="text-slate-400">When: </span>{b.date_needed}
        </p>
        {b.budget && <p className="text-sm text-slate-700"><span className="text-slate-400">Budget: </span>{b.budget}</p>}
        {b.notes && <p className="text-xs text-slate-500 italic mt-1">"{b.notes}"</p>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <a
          href={`${waLink}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold hover:bg-[#20b558] transition-colors"
        >
          💬 Follow up
        </a>

        {!isClosed && !expired && (
          <button
            onClick={handleClose}
            disabled={closing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {closing ? '…' : '✕ Close'}
          </button>
        )}

        {isClosed && (
          <button
            onClick={handleReopen}
            disabled={reopening}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            {reopening ? '…' : '↩ Reopen'}
          </button>
        )}
      </div>

      {/* Notify matching providers — only shown for active broadcasts */}
      {!isClosed && matchingProviders.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Notify these providers
          </p>
          <div className="flex flex-wrap gap-2">
            {matchingProviders.map((prov) => {
              const link = buildNotifyLink(prov)
              if (!link) return null
              return (
                <a
                  key={prov.id}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium bg-white hover:border-[var(--pl-teal)] hover:text-[var(--pl-teal)] transition-colors"
                >
                  💬 {prov.name}
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Walk report card (admin view) ────────────────────────────────
function WalkReportAdminCard({ r }: { r: WalkReport }) {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in')
  const opened = r.view_count > 0
  const saved = !!r.customer_id

  return (
    <div className="bg-white border border-border rounded-2xl p-4">
      <div className="flex gap-3 items-start">
        {/* Dog photo */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center text-2xl">
          {r.photo_url
            ? <img src={r.photo_url} alt={r.dog_name} className="w-full h-full object-cover" />
            : <span>🐕</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{r.dog_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(r.walk_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(r.created_at)}</span>
          </div>

          <div className="flex gap-3 mt-2 text-xs text-slate-500 flex-wrap">
            <span>⏱ {r.duration_mins} min</span>
            <span>📍 {fmtDistance(r.distance_meters)}</span>
            <span>💩 {r.poop_count}</span>
            <span>💧 {r.pee_count}</span>
          </div>

          {/* Funnel row */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
              ✓ Generated
            </span>
            <span className="text-slate-200 text-xs">→</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${opened ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
              👁 {opened ? `Opened ${r.view_count > 1 ? `×${r.view_count}` : ''}` : 'Not opened'}
            </span>
            <span className="text-slate-200 text-xs">→</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
              {saved ? `💾 Saved · ${r.customer?.name ?? r.customer?.email ?? 'Customer'}` : '💾 Not saved'}
            </span>

            {/* View report */}
            <a
              href={`${siteUrl}/walk-report/${r.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[10px] font-semibold text-[var(--pl-teal)] hover:underline"
            >
              Open ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main admin page ──────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('providers')
  const [filter, setFilter] = useState<ProviderStatus>('pending')
  const [broadcastFilter, setBroadcastFilter] = useState<'active' | 'closed' | 'expired'>('active')
  const [providers, setProviders] = useState<ProviderWithPhotos[]>([])
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<(Review & { provider_name?: string })[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [broadcastsLoading, setBroadcastsLoading] = useState(false)
  const [approvedProviders, setApprovedProviders] = useState<any[]>([])
  const [walkReports, setWalkReports] = useState<WalkReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [groomingReports, setGroomingReports] = useState<GroomingReport[]>([])
  const [groomingReportsLoading, setGroomingReportsLoading] = useState(false)
  const [groomingCount, setGroomingCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [broadcastCount, setBroadcastCount] = useState(0)
  const [reportsCount, setReportsCount] = useState(0)
  const [stats, setStats] = useState<{
    totalApproved: number
    totalPending: number
    totalRejected: number
    totalBroadcasts: number
    totalWalkReports: number
    claimedReports: number
    providerStats: {
      id: string
      name: string
      category: string
      whatsapp_clicks: number
      profile_views: number
      neighbourhood: string
      created_at: string
      reports_sent: number
      reports_viewed: number
      open_rate: number
    }[]
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [providerStats, setProviderStats] = useState<Record<string, { views30d: number; reportsThisWeek: number; reportsSent30d: number }>>({})
  const [editingProvider, setEditingProvider] = useState<ProviderWithPhotos | null>(null)
  const [careStats, setCareStats] = useState<CareStats | null>(null)
  const [careConnections, setCareConnections] = useState<CareConnection[]>([])
  const [careWalkLogs, setCareWalkLogs] = useState<CareWalkLog[]>([])
  const [careLoading, setCareLoading] = useState(false)

  // Load counts on mount — all via admin API routes (service role, bypasses RLS)
  useEffect(() => {
    fetch('/api/admin/provider-stats')
      .then(r => r.json())
      .then(d => { if (!d.error) setProviderStats(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/providers?status=pending')
      .then((r) => r.json())
      .then((data) => setPendingCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/broadcasts')
      .then((r) => r.json())
      .then((data) => setBroadcastCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/walk-reports')
      .then((r) => r.json())
      .then((data) => setReportsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/grooming-reports')
      .then((r) => r.json())
      .then((data) => setGroomingCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [])

  async function loadProviders(status: ProviderStatus) {
    setLoading(true)
    const data = await fetch(`/api/admin/providers?status=${status}`).then((r) => r.json()).catch(() => [])
    setProviders((Array.isArray(data) ? data : []) as unknown as ProviderWithPhotos[])
    setLoading(false)
  }

  async function loadReviews() {
    setReviewsLoading(true)
    const data = await fetch('/api/admin/reviews').then((r) => r.json()).catch(() => [])
    setReviews(Array.isArray(data) ? data : [])
    setReviewsLoading(false)
  }

  async function loadBroadcasts() {
    setBroadcastsLoading(true)
    const [broadcastData, provData] = await Promise.all([
      fetch('/api/admin/broadcasts').then((r) => r.json()).catch(() => []),
      fetch('/api/admin/providers?status=approved').then((r) => r.json()).catch(() => []),
    ])
    setBroadcasts(Array.isArray(broadcastData) ? broadcastData : [])
    setApprovedProviders(Array.isArray(provData) ? provData : [])
    setBroadcastsLoading(false)
  }

  async function loadWalkReports() {
    setReportsLoading(true)
    const res = await fetch('/api/admin/walk-reports')
    const data = await res.json().catch(() => [])
    setWalkReports(Array.isArray(data) ? data : [])
    setReportsCount(Array.isArray(data) ? data.length : 0)
    setReportsLoading(false)
  }

  async function loadGroomingReports() {
    setGroomingReportsLoading(true)
    const data = await fetch('/api/admin/grooming-reports').then((r) => r.json()).catch(() => [])
    setGroomingReports(Array.isArray(data) ? data : [])
    setGroomingCount(Array.isArray(data) ? data.length : 0)
    setGroomingReportsLoading(false)
  }

  async function loadStats() {
    setStatsLoading(true)
    const data = await fetch('/api/admin/stats').then((r) => r.json()).catch(() => null)
    if (!data || data.error) {
      setStatsLoading(false)
      return
    }
    setStats({
      totalApproved: data.totalApproved,
      totalPending: data.totalPending,
      totalRejected: data.totalRejected,
      totalBroadcasts: data.totalBroadcasts,
      totalWalkReports: data.totalWalkReports,
      claimedReports: data.claimedReports,
      providerStats: data.providerStats,
    })
    setStatsLoading(false)
  }

  async function loadCare() {
    setCareLoading(true)
    try {
      const res = await fetch('/api/admin/care-system')
      const data = await res.json().catch(() => null)
      if (!data || data.error) return
      setCareStats(data.stats ?? null)
      setCareConnections(Array.isArray(data.connections) ? data.connections : [])
      setCareWalkLogs(Array.isArray(data.walk_logs) ? data.walk_logs : [])
    } finally {
      setCareLoading(false)
    }
  }

  useEffect(() => { loadProviders(filter) }, [filter])
  useEffect(() => { if (tab === 'reviews') loadReviews() }, [tab])
  useEffect(() => { if (tab === 'broadcasts') loadBroadcasts() }, [tab])
  useEffect(() => { if (tab === 'reports') loadWalkReports() }, [tab])
  useEffect(() => { if (tab === 'grooming') loadGroomingReports() }, [tab])
  useEffect(() => { if (tab === 'stats') loadStats() }, [tab])
  useEffect(() => { if (tab === 'care') loadCare() }, [tab])

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    await fetch(`/api/admin/providers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setProviders((prev) => prev.filter((p) => p.id !== id))
    if (status === 'approved') setPendingCount((c) => Math.max(0, c - 1))
  }

  async function toggleVerified(id: string, val: boolean) {
    await fetch(`/api/admin/providers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_verified: val }),
    })
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, is_verified: val } : p))
  }

  async function setTier(id: string, tier: string) {
    await fetch(`/api/admin/providers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_tier: tier }),
    })
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, verification_tier: tier } : p))
  }

  function updateCoords(id: string, lat: number, lng: number) {
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, lat, lng } : p))
  }

  function handleEditClose(updated?: Partial<ProviderWithPhotos>) {
    if (updated && editingProvider) {
      setProviders((prev) => prev.map((p) => p.id === editingProvider.id ? { ...p, ...updated } : p))
    }
    setEditingProvider(null)
  }

  async function updateReview(id: string, status: 'approved' | 'rejected') {
    await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setReviews((prev) => prev.filter((r) => r.id !== id))
  }

  // Broadcast grouping — status is the source of truth, not just expiry
  const activeBroadcasts = broadcasts.filter((b) => b.status === 'active' && !isExpired(b.expires_at))
  const closedBroadcasts = broadcasts.filter((b) => b.status === 'closed' || b.status === 'filled')
  const expiredBroadcasts = broadcasts.filter((b) => b.status === 'active' && isExpired(b.expires_at))

  const filteredBroadcasts =
    broadcastFilter === 'active' ? activeBroadcasts :
    broadcastFilter === 'closed' ? closedBroadcasts :
    expiredBroadcasts

  // Walk report grouping

  return (
    <div className="max-w-lg mx-auto">
      {editingProvider && (
        <EditProviderModal provider={editingProvider} onClose={handleEditClose} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin</h1>
          <p className="text-xs text-slate-400 mt-0.5">PupStep · Juhu, Mumbai</p>
        </div>
        <a href="/" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">
          ← View site
        </a>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {([
          { key: 'providers', label: '🏠 Providers', badge: pendingCount, badgeColor: 'bg-red-500' },
          { key: 'broadcasts', label: '📣 Broadcasts', badge: broadcastCount, badgeColor: 'bg-amber-500' },
          { key: 'reports', label: '🐕 Walks', badge: reportsCount, badgeColor: 'bg-teal-500' },
          { key: 'grooming', label: '✂️ Grooming', badge: groomingCount, badgeColor: 'bg-purple-500' },
          { key: 'reviews', label: '⭐ Reviews', badge: 0, badgeColor: '' },
          { key: 'stats', label: '📊 Stats', badge: 0, badgeColor: '' },
          { key: 'care', label: '🐾 Care', badge: 0, badgeColor: '' },
        ] as { key: AdminTab; label: string; badge: number; badgeColor: string }[]).map(({ key, label, badge, badgeColor }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === key ? 'bg-slate-900 text-white' : 'bg-white border border-border text-slate-600 hover:border-slate-400'
            }`}
          >
            {label}
            {badge > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 ${badgeColor} text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PROVIDERS TAB ─────────────────────────────────────────── */}
      {tab === 'providers' && (
        <>
          <div className="flex gap-2 mb-5">
            {(['pending', 'approved', 'rejected'] as ProviderStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? f === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : f === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-white border border-border text-slate-500 hover:border-slate-400'
                }`}
              >
                {f === 'pending' && pendingCount > 0 ? `Pending (${pendingCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse h-32" />
              ))}
            </div>
          ) : providers.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl mb-3">{filter === 'pending' ? '🎉' : '📭'}</div>
              <p className="font-semibold text-slate-700">
                {filter === 'pending' ? 'All caught up!' : `No ${filter} providers`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {providers.map((p) => (
                <ProviderCard
                  key={p.id}
                  p={p}
                  filter={filter}
                  onStatusChange={updateStatus}
                  onVerifiedChange={toggleVerified}
                  onTierChange={setTier}
                  onCoordsSaved={updateCoords}
                  onEdit={setEditingProvider}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── BROADCASTS TAB ────────────────────────────────────────── */}
      {tab === 'broadcasts' && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-amber-800 mb-0.5">Phase 1 — Manual matching</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Customer posts → you WhatsApp the right provider → close when filled.
            </p>
          </div>

          {/* Broadcast status filter */}
          <div className="flex gap-2 mb-5">
            {([
              { key: 'active', label: `Active (${activeBroadcasts.length})` },
              { key: 'closed', label: `Closed (${closedBroadcasts.length})` },
              { key: 'expired', label: `Expired (${expiredBroadcasts.length})` },
            ] as { key: typeof broadcastFilter; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setBroadcastFilter(key)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  broadcastFilter === key
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-border text-slate-500 hover:border-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {broadcastsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse h-32" />)}
            </div>
          ) : filteredBroadcasts.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-semibold text-slate-700">No {broadcastFilter} broadcasts</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredBroadcasts.map((b) => (
                <BroadcastAdminCard
                  key={b.id}
                  b={b}
                  providers={approvedProviders}
                  onClose={(id) => {
                    setBroadcasts((prev) => prev.map((x) => x.id === id ? { ...x, status: 'closed' } : x))
                    setBroadcastFilter('closed')
                  }}
                  onReopen={(id) => {
                    setBroadcasts((prev) => prev.map((x) => x.id === id ? { ...x, status: 'active' } : x))
                    setBroadcastFilter('active')
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── WALK REPORTS TAB ─────────────────────────────────────── */}
      {tab === 'reports' && (() => {
        // Group by provider
        const byProvider: Record<string, { name: string; whatsapp: string | null; reports: WalkReport[] }> = {}
        for (const r of walkReports) {
          const pid = r.provider_id ?? '__unknown__'
          if (!byProvider[pid]) {
            byProvider[pid] = {
              name: r.providers?.name ?? 'Unknown walker',
              whatsapp: r.providers?.whatsapp ?? null,
              reports: [],
            }
          }
          byProvider[pid].reports.push(r)
        }

        const groups = Object.entries(byProvider)

        return (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                <p className="text-2xl font-bold text-teal-700">{walkReports.length}</p>
                <p className="text-xs font-medium text-teal-600 mt-0.5">Generated</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-2xl font-bold text-blue-700">{walkReports.filter(r => r.view_count > 0).length}</p>
                <p className="text-xs font-medium text-blue-600 mt-0.5">Opened</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <p className="text-2xl font-bold text-emerald-700">{walkReports.filter(r => r.customer_id).length}</p>
                <p className="text-xs font-medium text-emerald-600 mt-0.5">Saved</p>
              </div>
            </div>

            {reportsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse h-24" />)}
              </div>
            ) : walkReports.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-4xl mb-3">🐕</div>
                <p className="font-semibold text-slate-700">No walk reports yet</p>
                <p className="text-sm text-slate-400 mt-1">Providers submit these after walks.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {groups.map(([pid, group]) => {
                  const opened = group.reports.filter(r => r.view_count > 0).length
                  const saved = group.reports.filter(r => r.customer_id).length
                  const total = group.reports.length
                  return (
                    <div key={pid}>
                      {/* Provider header */}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{group.name}</p>
                          {group.whatsapp && (
                            <a
                              href={`https://wa.me/91${group.whatsapp.replace(/\D/g, '').slice(-10)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-[#25D366] hover:underline"
                            >
                              💬 WhatsApp
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <span className="text-teal-600 font-bold">{total}</span> sent
                          <span className="text-slate-300 mx-0.5">·</span>
                          <span className="text-blue-600 font-bold">{opened}</span> opened
                          <span className="text-slate-300 mx-0.5">·</span>
                          <span className="text-emerald-600 font-bold">{saved}</span> saved
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {group.reports.map((r) => <WalkReportAdminCard key={r.id} r={r} />)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      })()}

      {/* ── GROOMING REPORTS TAB ─────────────────────────────────── */}
      {tab === 'grooming' && (
        <>
          <div className="grid grid-cols-1 gap-3 mb-5">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <p className="text-2xl font-bold text-purple-700">{groomingReports.length}</p>
              <p className="text-xs font-medium text-purple-600 mt-0.5">Grooming sessions logged</p>
            </div>
          </div>

          {groomingReportsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse h-24" />)}
            </div>
          ) : groomingReports.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl mb-3">✂️</div>
              <p className="font-semibold text-slate-700">No grooming reports yet</p>
              <p className="text-sm text-slate-400 mt-1">Providers submit these after grooming sessions.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {groomingReports.map((r) => (
                <div key={r.id} className="bg-white border border-border rounded-2xl p-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl"
                      style={{ background: 'oklch(0.48 0.17 196 / 0.08)' }}>
                      {r.after_photo_url
                        ? <img src={r.after_photo_url} alt={r.dog_name} className="w-full h-full rounded-xl object-cover" />
                        : '✂️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{r.dog_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            by <span className="font-medium">{r.providers?.name ?? 'Unknown groomer'}</span>
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(r.created_at)}</span>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                        <span>⏱ {r.duration_mins} min</span>
                        {r.ticks_found > 0 && <span className="text-orange-600 font-semibold">🕷️ {r.ticks_found} tick{r.ticks_found !== 1 ? 's' : ''}</span>}
                        {r.services_done?.length > 0 && <span>🛁 {r.services_done.length} services</span>}
                      </div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {r.skin_condition !== 'normal' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold">Skin: {r.skin_condition}</span>
                        )}
                        {r.ear_condition !== 'clean' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">Ear: {r.ear_condition}</span>
                        )}
                        {r.nail_condition !== 'healthy' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">Nails: {r.nail_condition}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {r.providers?.whatsapp && (
                    <div className="mt-3 pt-3 border-t border-border flex gap-2">
                      <a
                        href={`/grooming-report/${r.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-1.5 rounded-lg border border-border text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        View report →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── STATS TAB ────────────────────────────────────────────── */}
      {tab === 'stats' && (
        statsLoading || !stats ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Overview tiles */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Live providers', value: stats.totalApproved, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { label: 'Pending review', value: stats.totalPending, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { label: 'Active broadcasts', value: stats.totalBroadcasts, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { label: 'Rejected', value: stats.totalRejected, color: 'bg-slate-50 text-slate-500 border-slate-200' },
                { label: 'Walk reports', value: stats.totalWalkReports, color: 'bg-teal-50 text-teal-700 border-teal-200' },
                { label: 'Reports claimed', value: stats.claimedReports, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              ].map((tile) => (
                <div key={tile.label} className={`rounded-2xl border p-4 ${tile.color}`}>
                  <p className="text-2xl font-bold">{tile.value}</p>
                  <p className="text-xs font-medium mt-0.5 opacity-80">{tile.label}</p>
                </div>
              ))}
            </div>

            {/* Per-provider breakdown */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Provider Performance (sorted by WhatsApp clicks)
              </p>
              <div className="flex flex-col gap-2">
                {stats.providerStats.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No approved providers yet.</p>
                ) : stats.providerStats.map((p) => {
                  const cat = getCategoryBySlug(p.category)
                  return (
                    <div key={p.id} className="bg-white border border-border rounded-2xl px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{cat?.icon ?? '🐾'}</span>
                            <p className="font-semibold text-sm text-slate-900 truncate">{p.name}</p>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{p.neighbourhood} · joined {timeAgo(p.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 text-right">
                          <div>
                            <p className="text-lg font-bold text-teal-600">{p.reports_sent ?? 0}</p>
                            <p className="text-[10px] text-slate-400">sent</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-purple-600">{p.reports_viewed ?? 0}</p>
                            <p className="text-[10px] text-slate-400">viewed</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-emerald-600">{p.whatsapp_clicks}</p>
                            <p className="text-[10px] text-slate-400">WA clicks</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-blue-600">{p.profile_views}</p>
                            <p className="text-[10px] text-slate-400">views</p>
                          </div>
                          <a
                            href={`/provider/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-slate-700 text-lg"
                          >
                            👁
                          </a>
                        </div>
                      </div>
                      {stats.providerStats[0]?.whatsapp_clicks > 0 && (
                        <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all"
                            style={{ width: `${(p.whatsapp_clicks / stats.providerStats[0].whatsapp_clicks) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      )}

      {/* ── CARE SYSTEM TAB ──────────────────────────────────────── */}
      {tab === 'care' && (
        careLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats cards */}
            {careStats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                  <p className="text-2xl font-bold text-teal-700">{careStats.total_dogs}</p>
                  <p className="text-xs font-medium text-teal-600 mt-0.5">Total Dogs</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <p className="text-2xl font-bold text-blue-700">{careStats.total_connections}</p>
                  <p className="text-xs font-medium text-blue-600 mt-0.5">Total Connections</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <p className="text-2xl font-bold text-emerald-700">{careStats.active_connections}</p>
                  <p className="text-xs font-medium text-emerald-600 mt-0.5">Active</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-2xl font-bold text-amber-700">{careStats.pending_connections}</p>
                  <p className="text-xs font-medium text-amber-600 mt-0.5">Pending</p>
                </div>
                <div className="col-span-2 bg-purple-50 border border-purple-200 rounded-2xl p-4">
                  <p className="text-2xl font-bold text-purple-700">{careStats.total_walk_logs}</p>
                  <p className="text-xs font-medium text-purple-600 mt-0.5">Total Walk Logs</p>
                </div>
              </div>
            )}

            {/* Recent Connections table */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Recent Connections
              </p>
              {careConnections.length === 0 ? (
                <div className="bg-white rounded-2xl border border-border py-8 text-center">
                  <p className="text-slate-400 text-sm">No connections yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {careConnections.map((c) => (
                    <div key={c.id} className="bg-white border border-border rounded-2xl px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900 truncate">{c.dog_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {c.walker_name ?? '—'}
                            {c.walker_phone && <span className="text-slate-400"> · {c.walker_phone}</span>}
                          </p>
                          {c.walker_role && (
                            <p className="text-xs text-slate-400 capitalize">{c.walker_role.replace('_', ' ')}</p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {c.claimed_at
                          ? `Claimed ${timeAgo(c.claimed_at)}`
                          : `Created ${timeAgo(c.created_at)}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Walk Logs table */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Recent Walk Logs
              </p>
              {careWalkLogs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-border py-8 text-center">
                  <p className="text-slate-400 text-sm">No walk logs yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {careWalkLogs.map((l) => (
                    <div key={l.id} className="bg-white border border-border rounded-2xl px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900">{l.dog_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{l.walker_name ?? 'Unknown walker'}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 flex-shrink-0">{timeAgo(l.created_at)}</p>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-slate-600 flex-wrap">
                        {l.duration_mins && <span>⏱ {l.duration_mins} min</span>}
                        <span>💩 {l.poop_count}</span>
                        <span>💧 {l.pee_count}</span>
                        {l.mood && <span className="capitalize text-slate-400">{l.mood}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ── REVIEWS TAB ───────────────────────────────────────────── */}
      {tab === 'reviews' && (
        reviewsLoading ? (
          <div className="py-20 text-center text-slate-400">Loading reviews…</div>
        ) : reviews.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">🌟</div>
            <p className="font-semibold text-slate-700">No pending reviews</p>
            <p className="text-sm text-slate-400 mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{r.reviewer_name}</p>
                    <p className="text-xs text-slate-400">
                      for <span className="font-medium text-slate-600">{r.provider_name}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <Stars rating={r.rating} size="sm" />
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-slate-600 mb-3 bg-slate-50 rounded-xl p-3">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}
                {r.reviewer_phone && (
                  <p className="text-xs text-slate-400 mb-3">📱 {r.reviewer_phone}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => updateReview(r.id, 'approved')}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    ✓ Publish
                  </button>
                  <button
                    onClick={() => updateReview(r.id, 'rejected')}
                    className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 border border-red-200 transition-colors"
                  >
                    ✗ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
