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

interface Props {
  broadcasts: Broadcast[]
  reviews: Review[]
  savedProviders: SavedProvider[]
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
  broadcasts, reviews, savedProviders: initialSaved,
  userDisplay, userAvatar, userId,
}: Props) {
  const [tab, setTab] = useState<'broadcasts' | 'saved' | 'reviews'>('broadcasts')
  const [savedProviders, setSavedProviders] = useState<SavedProvider[]>(initialSaved)
  const [displayName, setDisplayName] = useState(userDisplay)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(userDisplay)
  const [savingName, setSavingName] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Hydrate saved providers from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]') as SavedProvider[]
      setSavedProviders(saved)
    } catch {
      setSavedProviders([])
    }
  }, [])

  function removeSaved(id: string) {
    const updated = savedProviders.filter(p => p.id !== id)
    setSavedProviders(updated)
    localStorage.setItem('pawlocal_saved', JSON.stringify(updated))
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
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Broadcasts', count: broadcasts.length, emoji: '📣' },
          { label: 'Saved', count: savedProviders.length, emoji: '❤️' },
          { label: 'Reviews', count: reviews.length, emoji: '⭐' },
        ].map(({ label, count, emoji }) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(label.toLowerCase() as typeof tab)}
            className={`bg-white border rounded-xl p-3 text-center transition-all ${
              tab === label.toLowerCase()
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
        {(['broadcasts', 'saved', 'reviews'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'broadcasts' ? '📣 Broadcasts' : t === 'saved' ? '❤️ Saved' : '⭐ Reviews'}
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
