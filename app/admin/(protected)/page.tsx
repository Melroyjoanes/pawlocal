'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProviderWithPhotos, Review } from '@/lib/supabase/types'
import { getCategoryBySlug } from '@/lib/categories'
import { Stars } from '@/components/StarRating'

type ProviderStatus = 'pending' | 'approved' | 'rejected'
type AdminTab = 'providers' | 'broadcasts' | 'reviews'

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

// ── Copy-with-feedback hook ──────────────────────────────────────
function useCopy() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])
  return { copiedId, copy }
}

// ── Tier badge ───────────────────────────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  if (tier === 'certified')
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">🏅 Certified</span>
  if (tier === 'verified')
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">✓ Verified</span>
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Listed</span>
}

// ── Provider card ────────────────────────────────────────────────
function ProviderCard({
  p,
  filter,
  onStatusChange,
  onVerifiedChange,
  onTierChange,
  onCoordsSaved,
}: {
  p: ProviderWithPhotos
  filter: ProviderStatus
  onStatusChange: (id: string, status: 'approved' | 'rejected') => void
  onVerifiedChange: (id: string, val: boolean) => void
  onTierChange: (id: string, tier: string) => void
  onCoordsSaved: (id: string, lat: number, lng: number) => void
}) {
  const { copiedId, copy } = useCopy()
  const [showCoords, setShowCoords] = useState(false)
  const [lat, setLat] = useState(String(p.lat ?? ''))
  const [lng, setLng] = useState(String(p.lng ?? ''))
  const [savingCoords, setSavingCoords] = useState(false)
  const [coordSaved, setCoordSaved] = useState(false)

  const category = getCategoryBySlug(p.category_slug)
  const primaryPhoto = p.provider_photos?.find((ph) => ph.is_primary) ?? p.provider_photos?.[0]
  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://pawlocal-ashen.vercel.app'}/provider/${p.id}`
  const waNotifyText = encodeURIComponent(
    `Hi ${p.name}! 🎉 Your listing on PawLocal is live.\n\nView & manage your profile here:\n${profileUrl}\n\nThis link is your personal dashboard — bookmark it!\n\n- Team PawLocal 🐾`
  )
  const waNotifyUrl = `https://wa.me/91${p.whatsapp.replace(/\D/g, '').slice(-10)}?text=${waNotifyText}`

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
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="p-4 flex gap-3 items-start">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center text-2xl">
          {primaryPhoto
            ? <img src={primaryPhoto.url} alt={p.name} className="w-full h-full object-cover" />
            : <span>{category?.icon ?? '🐾'}</span>}
        </div>

        {/* Info */}
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

      {/* Actions */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {/* Pending actions */}
        {filter === 'pending' && (
          <>
            <button
              onClick={() => onStatusChange(p.id, 'approved')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onStatusChange(p.id, 'rejected')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 border border-red-200 transition-colors"
            >
              ✗ Reject
            </button>
          </>
        )}

        {/* Approved actions */}
        {filter === 'approved' && (
          <>
            {/* Copy dashboard link */}
            <button
              onClick={() => copy(p.id, profileUrl)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                copiedId === p.id
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-border text-slate-700 hover:border-slate-400'
              }`}
            >
              {copiedId === p.id ? '✓ Copied!' : '🔗 Copy Link'}
            </button>

            {/* WhatsApp notify */}
            <a
              href={waNotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#20b558] transition-colors"
            >
              💬 Notify on WA
            </a>

            {/* Verified toggle */}
            <button
              onClick={() => onVerifiedChange(p.id, !p.is_verified)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                p.is_verified
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-border text-slate-500 hover:border-slate-400'
              }`}
            >
              {p.is_verified ? '★ Verified' : '☆ Verify'}
            </button>

            {/* Tier select */}
            <select
              value={p.verification_tier ?? 'contacted'}
              onChange={(e) => onTierChange(p.id, e.target.value)}
              className="px-3 py-2 rounded-xl text-sm border border-border bg-white text-slate-700 hover:border-slate-400 cursor-pointer transition-colors"
            >
              <option value="contacted">Tier: Listed</option>
              <option value="verified">Tier: Verified</option>
              <option value="certified">Tier: Certified</option>
            </select>

            {/* Fix Location */}
            <button
              onClick={() => setShowCoords((v) => !v)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-border text-slate-500 hover:border-slate-400 bg-white transition-colors"
            >
              📍 Fix Pin
            </button>
          </>
        )}

        {/* Always: view profile */}
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border border-border text-slate-500 hover:border-slate-400 bg-white transition-colors"
        >
          👁 Profile
        </a>

        {/* Always: direct WA */}
        <a
          href={`https://wa.me/91${p.whatsapp.replace(/\D/g, '').slice(-10)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border border-border text-slate-500 hover:border-slate-400 bg-white transition-colors"
        >
          💬 Chat
        </a>
      </div>

      {/* Coordinate editor (expandable) */}
      {showCoords && filter === 'approved' && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Fix map pin coordinates</p>
          <p className="text-xs text-slate-400 mb-3">
            Open <a href={`https://maps.google.com/?q=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer" className="underline text-[var(--pl-teal)]">Google Maps</a>, right-click the correct location → copy coordinates → paste below.
          </p>
          <div className="flex gap-2 items-end flex-wrap">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Latitude</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="19.1075"
                className="w-28 border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Longitude</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="72.8263"
                className="w-28 border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)]"
              />
            </div>
            <button
              onClick={saveCoords}
              disabled={savingCoords}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                coordSaved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[var(--pl-teal)] text-white hover:opacity-90'
              } disabled:opacity-50`}
            >
              {savingCoords ? 'Saving…' : coordSaved ? '✓ Saved' : 'Save Pin'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Broadcast card (admin view) ──────────────────────────────────
function BroadcastAdminCard({ b }: { b: Broadcast }) {
  const svc = SERVICE_LABELS[b.service_slug] ?? { label: b.service_slug, icon: '🐾' }
  const expired = isExpired(b.expires_at)
  const waLink = `https://wa.me/91${b.poster_whatsapp.replace(/\D/g, '').slice(-10)}`
  const waText = encodeURIComponent(
    `Hi ${b.poster_name}! I saw your request on PawLocal for ${svc.label}. Let me help connect you with the right provider. 🐾`
  )

  return (
    <div className={`bg-white border rounded-2xl p-4 ${expired ? 'opacity-50 border-border' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{svc.icon}</span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{svc.label}</p>
            <p className="text-xs text-slate-400">{b.area} · {timeAgo(b.created_at)}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${expired ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          {expired ? 'Expired' : 'Active'}
        </span>
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

      <div className="flex gap-2">
        <a
          href={`${waLink}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold hover:bg-[#20b558] transition-colors"
        >
          💬 Follow up
        </a>
        <a
          href={`/${b.service_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
        >
          Find providers →
        </a>
      </div>
    </div>
  )
}

// ── Main admin page ──────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('providers')
  const [filter, setFilter] = useState<ProviderStatus>('pending')
  const [providers, setProviders] = useState<ProviderWithPhotos[]>([])
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<(Review & { provider_name?: string })[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [broadcastsLoading, setBroadcastsLoading] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [broadcastCount, setBroadcastCount] = useState(0)

  // Load pending count on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.from('providers').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0))
  }, [])

  // Load active broadcast count on mount
  useEffect(() => {
    fetch('/api/broadcasts')
      .then((r) => r.json())
      .then((data) => setBroadcastCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [])

  async function loadProviders(status: ProviderStatus) {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('providers')
      .select('*, provider_photos(*)')
      .eq('status', status)
      .order('created_at', { ascending: false })
    setProviders((data as unknown as ProviderWithPhotos[]) ?? [])
    setLoading(false)
  }

  async function loadReviews() {
    setReviewsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('reviews')
      .select('*, providers(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setReviews((data ?? []).map((r: any) => ({ ...r, provider_name: r.providers?.name })))
    setReviewsLoading(false)
  }

  async function loadBroadcasts() {
    setBroadcastsLoading(true)
    const res = await fetch('/api/admin/broadcasts')
    const data = await res.json().catch(() => [])
    setBroadcasts(Array.isArray(data) ? data : [])
    setBroadcastsLoading(false)
  }

  useEffect(() => { loadProviders(filter) }, [filter])
  useEffect(() => { if (tab === 'reviews') loadReviews() }, [tab])
  useEffect(() => { if (tab === 'broadcasts') loadBroadcasts() }, [tab])

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

  async function updateReview(id: string, status: 'approved' | 'rejected') {
    await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setReviews((prev) => prev.filter((r) => r.id !== id))
  }

  const activeBroadcasts = broadcasts.filter((b) => !isExpired(b.expires_at))
  const expiredBroadcasts = broadcasts.filter((b) => isExpired(b.expires_at))

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin</h1>
          <p className="text-xs text-slate-400 mt-0.5">PawLocal · Juhu, Mumbai</p>
        </div>
        <a href="/" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">
          ← View site
        </a>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('providers')}
          className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'providers' ? 'bg-slate-900 text-white' : 'bg-white border border-border text-slate-600 hover:border-slate-400'
          }`}
        >
          🏠 Providers
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('broadcasts')}
          className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'broadcasts' ? 'bg-slate-900 text-white' : 'bg-white border border-border text-slate-600 hover:border-slate-400'
          }`}
        >
          📣 Broadcasts
          {broadcastCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {broadcastCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('reviews')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'reviews' ? 'bg-slate-900 text-white' : 'bg-white border border-border text-slate-600 hover:border-slate-400'
          }`}
        >
          ⭐ Reviews
        </button>
      </div>

      {/* ── PROVIDERS TAB ─────────────────────────────────────────── */}
      {tab === 'providers' && (
        <>
          {/* Status filter */}
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
              <p className="text-sm text-slate-400 mt-1">
                {filter === 'pending' ? 'No pending submissions right now.' : ''}
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
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── BROADCASTS TAB ────────────────────────────────────────── */}
      {tab === 'broadcasts' && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5">
            <p className="text-sm font-semibold text-amber-800 mb-0.5">How Pet Broadcast works (phase 1)</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              A customer posts a request → it shows up here + on the public broadcast page → you manually WhatsApp relevant approved providers. When we have 15+ providers, they'll reply directly.
            </p>
          </div>

          {broadcastsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse h-32" />)}
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-semibold text-slate-700">No broadcasts yet</p>
              <p className="text-sm text-slate-400 mt-1">Share the broadcast page with your community.</p>
            </div>
          ) : (
            <>
              {activeBroadcasts.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                    Active ({activeBroadcasts.length})
                  </p>
                  <div className="flex flex-col gap-3">
                    {activeBroadcasts.map((b) => <BroadcastAdminCard key={b.id} b={b} />)}
                  </div>
                </div>
              )}
              {expiredBroadcasts.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                    Expired ({expiredBroadcasts.length})
                  </p>
                  <div className="flex flex-col gap-3">
                    {expiredBroadcasts.map((b) => <BroadcastAdminCard key={b.id} b={b} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </>
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
