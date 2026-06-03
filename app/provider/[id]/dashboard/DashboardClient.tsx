'use client'

import { useState } from 'react'
import type { ProviderWithPhotos } from '@/lib/supabase/types'
import type { CategoryConfig } from '@/lib/categories'
import VerificationBadge from '@/components/VerificationBadge'

// ── Availability Toggle Card ─────────────────────────────────────
function AvailabilityCard({ provider }: { provider: ProviderWithPhotos }) {
  const [isAvailable, setIsAvailable] = useState(provider.is_available !== false)
  const [note, setNote] = useState(provider.availability_note ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleToggle(value: boolean) {
    setIsAvailable(value)
    setSaved(false)
    setError('')
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')

    const res = await fetch('/api/provider/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_id: provider.id,
        is_available: isAvailable,
        availability_note: note.trim() || null,
      }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error ?? 'Failed to save')
      return
    }
    setSaved(true)
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5 mb-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Availability</p>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {isAvailable ? 'Available for bookings' : 'Fully booked'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAvailable ? 'Customers can contact you for new bookings.' : 'Shown as fully booked on your profile.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!isAvailable)}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            isAvailable ? 'bg-emerald-500' : 'bg-red-400'
          }`}
          role="switch"
          aria-checked={isAvailable}
        >
          <span
            className={`inline-block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${
              isAvailable ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Availability note <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="e.g. Back on June 15th"
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5 mb-3">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2.5 mb-3">Saved successfully.</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
          color: '#451A03',
          boxShadow: '0 4px 0px rgba(120,53,15,0.28)',
        }}
      >
        {saving ? 'Saving…' : 'Save availability'}
      </button>
    </div>
  )
}

// ── Points engine ────────────────────────────────────────────────
function calcPoints(stats: Stats, provider: ProviderWithPhotos) {
  let pts = 0
  const breakdown: { label: string; pts: number }[] = []

  // Profile completeness
  if (provider.is_verified) {
    pts += 100; breakdown.push({ label: 'Verified by PawLocal', pts: 100 })
  }
  const complete = provider.bio && provider.price_min && provider.provider_photos.length > 0
  if (complete) {
    pts += 50; breakdown.push({ label: 'Complete profile', pts: 50 })
  }

  // Reviews
  if (stats.reviews > 0) {
    const reviewPts = stats.reviews * 25
    pts += reviewPts; breakdown.push({ label: `${stats.reviews} approved review${stats.reviews > 1 ? 's' : ''}`, pts: reviewPts })
  }
  if (stats.fiveStarReviews > 0) {
    const bonusPts = stats.fiveStarReviews * 10
    pts += bonusPts; breakdown.push({ label: `${stats.fiveStarReviews} five-star bonus`, pts: bonusPts })
  }

  // Contacts (WhatsApp clicks)
  if (stats.contacts >= 10) {
    const contactPts = Math.floor(stats.contacts / 10) * 15
    pts += contactPts; breakdown.push({ label: `${stats.contacts} WhatsApp contacts`, pts: contactPts })
  }

  // Views milestones
  if (stats.views >= 50) {
    const viewPts = Math.floor(stats.views / 50) * 10
    pts += viewPts; breakdown.push({ label: `${stats.views} profile views`, pts: viewPts })
  }

  return { pts, breakdown }
}

function getLevel(pts: number) {
  if (pts >= 500) return { name: 'Gold', emoji: '🥇', color: '#F59E0B', next: null, nextAt: null }
  if (pts >= 200) return { name: 'Silver', emoji: '🥈', color: '#94A3B8', next: 'Gold', nextAt: 500 }
  return { name: 'Bronze', emoji: '🥉', color: '#B45309', next: 'Silver', nextAt: 200 }
}

interface Stats {
  views: number
  viewsThisMonth: number
  contacts: number
  contactsThisMonth: number
  calls: number
  reviews: number
  fiveStarReviews: number
  avgRating: number
  totalContacted: number
  responded: number
  booked: number
  responseRate: number | null
}

interface Props {
  provider: ProviderWithPhotos
  category: CategoryConfig
  stats: Stats
}

export default function DashboardClient({ provider, category, stats }: Props) {
  // No auth gate — the UUID in the URL is the private key.
  // Only someone you (admin) sent the link to can access this.

  // ── Dashboard ────────────────────────────────────────────────
  const { pts, breakdown } = calcPoints(stats, provider)
  const level = getLevel(pts)
  const progressPct = level.nextAt
    ? Math.min(100, Math.round((pts / level.nextAt) * 100))
    : 100

  return (
    <div className="max-w-lg mx-auto py-10 px-4 pb-16">
      <a
        href={`/provider/${provider.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        ← Back to profile
      </a>

      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: category.color + '18' }}
        >
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 leading-tight truncate">{provider.name}</h1>
          <p className="text-sm text-slate-400">{category.name} · dashboard</p>
        </div>
        <div className="shrink-0">
          <VerificationBadge tier={(provider.verification_tier as 'contacted' | 'verified' | 'certified') ?? 'contacted'} size="md" />
        </div>
      </div>

      {/* Availability toggle */}
      <AvailabilityCard provider={provider} />

      {/* Level card */}
      <div
        className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0D3528 0%, #1A5C42 100%)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">Your Level</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{level.emoji}</span>
              <span className="text-2xl font-bold">{level.name}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-60 mb-1">Total points</p>
            <p className="text-3xl font-bold">{pts}</p>
          </div>
        </div>

        {level.nextAt && (
          <div>
            <div className="flex justify-between text-xs opacity-70 mb-1.5">
              <span>{pts} pts</span>
              <span>{level.next} at {level.nextAt} pts</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-amber-400 h-2 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
        {!level.nextAt && (
          <p className="text-xs opacity-70">🏆 You've reached the highest level!</p>
        )}
      </div>

      {/* Stats grid */}
      {stats.views === 0 && stats.contacts === 0 && stats.reviews === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-6 mb-5 text-center">
          <p className="text-3xl mb-3">📈</p>
          <p className="font-semibold text-slate-900 mb-1">Your stats are warming up</p>
          <p className="text-sm text-slate-500 leading-relaxed">
            As customers visit your profile and click WhatsApp, your views and contacts will appear here automatically. Share your profile link to get your first stats!
          </p>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`https://pawlocal-ashen.vercel.app/provider/${provider.id}`)
                .then(() => alert('Profile link copied! Share it on WhatsApp.'))
            }}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border text-slate-700 hover:bg-muted transition-colors"
          >
            📋 Copy my profile link
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Profile views</p>
            <p className="text-2xl font-bold text-slate-900">{stats.views}</p>
            <p className="text-xs text-emerald-600 mt-0.5">+{stats.viewsThisMonth} this month</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">WhatsApp contacts</p>
            <p className="text-2xl font-bold text-slate-900">{stats.contacts}</p>
            <p className="text-xs text-emerald-600 mt-0.5">+{stats.contactsThisMonth} this month</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total reviews</p>
            <p className="text-2xl font-bold text-slate-900">{stats.reviews}</p>
            {stats.avgRating > 0 && (
              <p className="text-xs text-amber-500 mt-0.5">⭐ {stats.avgRating.toFixed(1)} avg rating</p>
            )}
          </div>
          <div className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Call clicks</p>
            <p className="text-2xl font-bold text-slate-900">{stats.calls}</p>
            <p className="text-xs text-muted-foreground mt-0.5">via profile page</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Response rate</p>
            {stats.totalContacted >= 5 && stats.responseRate !== null ? (
              <>
                <p className="text-2xl font-bold text-slate-900">{stats.responseRate}%</p>
                <p className="text-xs text-emerald-600 mt-0.5">{stats.responded}/{stats.totalContacted} replied</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-slate-400">—</p>
                <p className="text-xs text-muted-foreground mt-0.5">Not enough data yet</p>
              </>
            )}
          </div>
          <div className="bg-white border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Bookings confirmed</p>
            <p className="text-2xl font-bold text-slate-900">{stats.booked}</p>
            <p className="text-xs text-muted-foreground mt-0.5">via WhatsApp contact</p>
          </div>
        </div>
      )}

      {/* Points breakdown */}
      <div className="bg-white border border-border rounded-2xl p-5 mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">How you earned points</p>
        {breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No points yet. Complete your profile to start earning!</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {breakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{item.label}</span>
                <span className="text-sm font-semibold text-emerald-600">+{item.pts} pts</span>
              </div>
            ))}
            <div className="border-t border-border mt-1 pt-2.5 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Total</span>
              <span className="text-sm font-bold text-slate-900">{pts} pts</span>
            </div>
          </div>
        )}
      </div>

      {/* How to earn more */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3">Earn more points</p>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Get verified by PawLocal', pts: 100, done: provider.is_verified },
            { label: 'Add bio + pricing + photo', pts: 50, done: !!(provider.bio && provider.price_min && provider.provider_photos.length > 0) },
            { label: 'Per approved review received', pts: 25, done: false },
            { label: 'Per 5-star review (bonus)', pts: 10, done: false },
            { label: 'Every 10 WhatsApp contacts', pts: 15, done: false },
            { label: 'Every 50 profile views', pts: 10, done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.done ? '✅' : '⬜'}</span>
                <span className={`text-sm ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {item.label}
                </span>
              </div>
              <span className="text-xs font-semibold text-amber-700">+{item.pts} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <a
          href={`/provider/${provider.id}/edit`}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-center transition-all"
          style={{
            background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
            color: '#451A03',
            boxShadow: '0 4px 0px rgba(120,53,15,0.28)',
          }}
        >
          ✏️ Edit listing
        </a>
        <a
          href={`/provider/${provider.id}`}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-center border border-border bg-white text-slate-700 hover:bg-muted transition-colors"
        >
          👁 View profile
        </a>
      </div>
    </div>
  )
}
