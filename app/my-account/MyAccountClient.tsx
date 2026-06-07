'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Broadcast {
  id: string
  service_slug: string
  pet_description: string
  area: string
  date_needed: string
  budget: string | null
  status: string
  created_at: string
}

interface Review {
  id: string
  provider_id: string
  rating: number
  comment: string | null
  created_at: string
  providers?: { name: string }
}

interface SavedProvider {
  id: string
  name: string
  category_slug: string
  whatsapp: string
}

interface BookingRequest {
  id: string
  provider_id: string
  service_slug: string
  pet_name: string
  pet_type: string
  date_needed: string
  time_needed: string
  notes: string | null
  status: string
  created_at: string
  providers?: { name: string; category_slug: string }
}

interface Props {
  broadcasts: Broadcast[]
  reviews: Review[]
  savedProviders: SavedProvider[]
  bookingRequests: BookingRequest[]
  userDisplay: string
  userAvatar?: string | null
  userId: string
}

const SERVICE_LABELS: Record<string, string> = {
  'dog-walking':  '🦮 Dog Walking',
  'grooming':     '✂️ Grooming',
  'vet':          '🏥 Vet',
  'pet-store':    '🏪 Pet Store',
  'dog-training': '🎓 Dog Training',
  'insurance':    '🛡️ Insurance',
}

const CATEGORY_COLORS: Record<string, string> = {
  'dog-walking': '#0D9488',
  'grooming': '#7C3AED',
  'vet': '#DC2626',
  'pet-store': '#D97706',
  'dog-training': '#2563EB',
  'insurance': '#059669',
}

export default function MyAccountClient({
  broadcasts, reviews, savedProviders: initialSaved, bookingRequests,
  userDisplay, userAvatar, userId,
}: Props) {
  const [tab, setTab] = useState<'broadcasts' | 'saved' | 'reviews' | 'bookings'>('broadcasts')
  const [savedProviders, setSavedProviders] = useState<SavedProvider[]>(initialSaved)
  const [displayName, setDisplayName] = useState(userDisplay)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(userDisplay)
  const [savingName, setSavingName] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Hydrate saved providers from API (signed-in users) with localStorage fallback
  useEffect(() => {
    fetch('/api/customer/saved')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSavedProviders(data)
          // Sync to localStorage for offline access
          localStorage.setItem('pawlocal_saved', JSON.stringify(data))
        } else {
          // Fallback: load from localStorage
          try {
            const local = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]')
            if (Array.isArray(local)) setSavedProviders(local)
          } catch { /* ignore */ }
        }
      })
      .catch(() => {
        try {
          const local = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]')
          if (Array.isArray(local)) setSavedProviders(local)
        } catch { /* ignore */ }
      })
  }, [])

  function removeSaved(id: string) {
    const updated = savedProviders.filter(p => p.id !== id)
    setSavedProviders(updated)
    localStorage.setItem('pawlocal_saved', JSON.stringify(updated))
    // Also remove from DB
    fetch(`/api/customer/saved/${id}`, { method: 'DELETE' }).catch(() => {/* ignore */})
  }

  async function handleSaveName() {
    if (!nameInput.trim() || nameInput.trim() === displayName) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } })
    setDisplayName(nameInput.trim())
    setSavingName(false)
    setEditingName(false)
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div className="max-w-lg mx-auto py-10 px-4 pb-16">

      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Home
        </a>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      {/* Profile card */}
      <div className="bg-white border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatar}
              alt={displayName}
              className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 border border-border"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl font-bold text-amber-600 flex-shrink-0">
              {initials}
            </div>
          )}

          {/* Name + edit */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="flex-1 text-sm font-semibold border border-border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-amber-400"
                  autoFocus
                  maxLength={60}
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                >
                  {savingName ? '…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingName(false); setNameInput(displayName) }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 truncate">{displayName}</p>
                <button
                  type="button"
                  onClick={() => { setEditingName(true); setNameInput(displayName) }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                  title="Edit name"
                >
                  ✏️
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                ✓ Signed in
              </span>
              <span className="text-xs text-slate-400">Pet owner</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Broadcasts', value: 'broadcasts', count: broadcasts.length, emoji: '📣' },
          { label: 'Saved', value: 'saved', count: savedProviders.length, emoji: '❤️' },
          { label: 'Reviews', value: 'reviews', count: reviews.length, emoji: '⭐' },
          { label: 'Bookings', value: 'bookings', count: bookingRequests.length, emoji: '📅' },
        ].map(({ label, value, count, emoji }) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(value as typeof tab)}
            className={`bg-white border rounded-xl p-3 text-center transition-all ${
              tab === value
                ? 'border-[var(--pl-teal)] shadow-sm'
                : 'border-border hover:border-slate-300'
            }`}
          >
            <p className="text-lg">{emoji}</p>
            <p className="text-xl font-bold text-slate-900">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {(['broadcasts', 'saved', 'reviews', 'bookings'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'broadcasts' ? '📣 Broadcasts' : t === 'saved' ? '❤️ Saved' : t === 'reviews' ? '⭐ Reviews' : '📅 Bookings'}
          </button>
        ))}
      </div>

      {/* Tab: Broadcasts */}
      {tab === 'broadcasts' && (
        <div className="flex flex-col gap-3">
          {broadcasts.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">📣</p>
              <p className="font-semibold text-slate-900 mb-1">No broadcasts yet</p>
              <p className="text-sm text-slate-500 mb-5">Post a need and let providers come to you.</p>
              <a
                href="/broadcast"
                className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)', color: '#451A03' }}
              >
                Post a broadcast →
              </a>
            </div>
          ) : (
            broadcasts.map(b => (
              <div key={b.id} className="bg-white border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {SERVICE_LABELS[b.service_slug] ?? b.service_slug}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    b.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                    b.status === 'filled' ? 'bg-blue-50 text-blue-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {b.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-1">{b.pet_description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>📍 {b.area}</span>
                  <span>📅 {b.date_needed}</span>
                  {b.budget && <span>💰 {b.budget}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))
          )}
          {broadcasts.length > 0 && (
            <a href="/broadcast" className="text-center text-sm text-[var(--pl-teal)] font-medium py-2 hover:underline">
              + Post another broadcast
            </a>
          )}
        </div>
      )}

      {/* Tab: Saved */}
      {tab === 'saved' && (
        <div className="flex flex-col gap-3">
          {savedProviders.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">❤️</p>
              <p className="font-semibold text-slate-900 mb-1">No saved providers yet</p>
              <p className="text-sm text-slate-500 mb-5">Tap ❤️ on any provider profile to save them here.</p>
              <a href="/" className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm border border-border text-slate-700 hover:bg-muted transition-colors">
                Browse providers
              </a>
            </div>
          ) : (
            savedProviders.map(p => {
              const color = CATEGORY_COLORS[p.category_slug] ?? '#64748b'
              return (
                <div key={p.id} className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: color + '18' }}
                  >
                    🐾
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{p.category_slug.replace(/-/g, ' ')}</p>
                  </div>
                  <a
                    href={`/provider/${p.id}`}
                    className="text-xs font-medium text-[var(--pl-teal)] hover:underline flex-shrink-0"
                  >
                    View →
                  </a>
                  <a
                    href={`https://wa.me/91${p.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-full hover:bg-green-700 transition-colors flex-shrink-0"
                  >
                    WA
                  </a>
                  <button
                    onClick={() => removeSaved(p.id)}
                    className="text-xs text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Tab: Reviews */}
      {tab === 'reviews' && (
        <div className="flex flex-col gap-3">
          {reviews.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">⭐</p>
              <p className="font-semibold text-slate-900 mb-1">No reviews written yet</p>
              <p className="text-sm text-slate-500">After using a service, leave a review to help the community.</p>
            </div>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="bg-white border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <a href={`/provider/${r.provider_id}`} className="text-sm font-semibold text-slate-900 hover:text-[var(--pl-teal)] transition-colors">
                      {r.providers?.name ?? 'Provider'}
                    </a>
                    <div className="flex mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-sm ${i < r.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {r.comment && <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Bookings */}
      {tab === 'bookings' && (
        <div className="flex flex-col gap-3">
          {bookingRequests.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">📅</p>
              <p className="font-semibold text-slate-900 mb-1">No booking requests yet</p>
              <p className="text-sm text-slate-500">Send a booking request from any provider profile.</p>
            </div>
          ) : (
            bookingRequests.map(b => {
              const statusStyles =
                b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                b.status === 'declined'  ? 'bg-red-50 text-red-600' :
                'bg-teal-50 text-teal-700'
              return (
                <div key={b.id} className="bg-white border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <a
                      href={`/provider/${b.provider_id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-[var(--pl-teal)] transition-colors"
                    >
                      {b.providers?.name ?? 'Provider'}
                    </a>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusStyles}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-1 capitalize">
                    {b.service_slug.replace(/-/g, ' ')}
                  </p>
                  {b.pet_name && (
                    <p className="text-sm text-slate-500 mb-1">
                      {b.pet_type ? `${b.pet_type} named ${b.pet_name}` : b.pet_name}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>📅 {b.date_needed}</span>
                    {b.time_needed && <span>🕐 {b.time_needed}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Footer — switch role */}
      <div className="mt-10 pt-6 border-t border-border text-center">
        <p className="text-xs text-slate-400 mb-2">Are you a service provider?</p>
        <a href="/my-listing" className="text-xs font-semibold text-[var(--pl-teal)] hover:underline">
          Access provider dashboard →
        </a>
      </div>
    </div>
  )
}
