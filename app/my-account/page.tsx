'use client'

import { useState, useEffect } from 'react'

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

const SERVICE_LABELS: Record<string, string> = {
  'dog-walking': '🦮 Dog Walking',
  'grooming':    '✂️ Grooming',
  'vet':         '🏥 Vet',
  'pet-store':   '🏪 Pet Store',
  'dog-training':'🎓 Dog Training',
  'insurance':   '🛡️ Insurance',
}

export default function MyAccountPage() {
  // Auth state
  const [verified, setVerified] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyErr, setVerifyErr] = useState('')

  // Data
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [savedProviders, setSavedProviders] = useState<SavedProvider[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'broadcasts' | 'saved' | 'reviews'>('broadcasts')

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    setVerifyErr('')

    const num = whatsapp.replace(/\D/g, '').replace(/^91/, '')
    if (num.length < 10) {
      setVerifyErr('Enter your 10-digit WhatsApp number')
      setVerifying(false)
      return
    }

    setLoading(true)
    const res = await fetch(`/api/customer/data?whatsapp=${encodeURIComponent(whatsapp)}`)
    const json = await res.json()

    setBroadcasts(json.broadcasts ?? [])
    setReviews(json.reviews ?? [])

    // Saved providers from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]') as SavedProvider[]
      setSavedProviders(saved)
    } catch {
      setSavedProviders([])
    }

    setVerified(true)
    setVerifying(false)
    setLoading(false)
  }

  function removeSaved(id: string) {
    const updated = savedProviders.filter(p => p.id !== id)
    setSavedProviders(updated)
    localStorage.setItem('pawlocal_saved', JSON.stringify(updated))
  }

  // ── Verify gate ──────────────────────────────────────────────
  if (!verified) {
    return (
      <div className="max-w-md mx-auto py-14 px-4">
        <a href="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          ← Back
        </a>

        <div className="bg-white border border-border rounded-2xl p-7 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl mb-5">🐶</div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Pet owner account</h1>
          <p className="text-sm text-slate-500 mb-7">
            Enter your WhatsApp number to see your broadcasts, saved providers, and reviews.
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
              disabled={verifying || loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
                color: '#451A03',
                boxShadow: '0 4px 0px rgba(120,53,15,0.28)',
              }}
            >
              {verifying || loading ? 'Loading…' : 'View my account →'}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-400 text-center mt-5">
          Never posted or saved anything yet?{' '}
          <a href="/" className="underline hover:text-slate-600">Browse providers</a>
        </p>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto py-10 px-4 pb-16">
      <a href="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        ← Back
      </a>

      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-xl flex-shrink-0">🐶</div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">My account</h1>
          <p className="text-sm text-slate-400">+91 {whatsapp.replace(/\D/g, '').replace(/^91/, '')}</p>
        </div>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">✓ Verified</span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: 'Broadcasts', count: broadcasts.length, emoji: '📣' },
          { label: 'Saved', count: savedProviders.length, emoji: '❤️' },
          { label: 'Reviews', count: reviews.length, emoji: '⭐' },
        ].map(({ label, count, emoji }) => (
          <div key={label} className="bg-white border border-border rounded-xl p-3 text-center">
            <p className="text-lg">{emoji}</p>
            <p className="text-xl font-bold text-slate-900">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {(['broadcasts', 'saved', 'reviews'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
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
                  Posted {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))
          )}
          {broadcasts.length > 0 && (
            <a
              href="/broadcast"
              className="text-center text-sm text-[var(--pl-teal)] font-medium py-2 hover:underline"
            >
              + Post another broadcast
            </a>
          )}
        </div>
      )}

      {/* Tab: Saved providers */}
      {tab === 'saved' && (
        <div className="flex flex-col gap-3">
          {savedProviders.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">❤️</p>
              <p className="font-semibold text-slate-900 mb-1">No saved providers yet</p>
              <p className="text-sm text-slate-500 mb-5">
                Tap the ❤️ on any provider's profile to save them here.
              </p>
              <a href="/" className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm border border-border text-slate-700 hover:bg-muted transition-colors">
                Browse providers
              </a>
            </div>
          ) : (
            savedProviders.map(p => (
              <div key={p.id} className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{p.category_slug.replace(/-/g, ' ')}</p>
                </div>
                <a
                  href={`https://wa.me/91${p.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-full hover:bg-green-700 transition-colors"
                >
                  💬 WhatsApp
                </a>
                <a href={`/provider/${p.id}`} className="text-xs text-[var(--pl-teal)] font-medium hover:underline">
                  View
                </a>
                <button
                  onClick={() => removeSaved(p.id)}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-1"
                >
                  ✕
                </button>
              </div>
            ))
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
                    <p className="text-sm font-semibold text-slate-900">
                      {r.providers?.name ?? 'Provider'}
                    </p>
                    <p className="text-amber-400 text-sm">{'⭐'.repeat(r.rating)}</p>
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
    </div>
  )
}
