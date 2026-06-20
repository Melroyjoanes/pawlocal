'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface Broadcast {
  id: string; service_slug: string; pet_description: string
  area: string; date_needed: string; budget: string | null
  status: string; created_at: string
}
interface Review {
  id: string; provider_id: string; rating: number
  comment: string | null; created_at: string
  providers?: { name: string }
}
interface SavedProvider {
  id: string; name: string; category_slug: string; whatsapp: string
}
interface BookingRequest {
  id: string; provider_id: string; service_slug: string
  pet_name: string; pet_type: string; date_needed: string
  time_needed: string; notes: string | null; status: string
  created_at: string; providers?: { name: string; category_slug: string }
}
interface ClaimedReport {
  id: string
  token: string
  dog_name: string
  walk_date: string
  duration_mins: number
  poop_count: number
  pee_count: number
  distance_meters: number | null
  photo_url: string | null
  providers?: { name: string; is_verified: boolean }
}
interface ClaimedGroomingReport {
  id: string
  token: string
  dog_name: string
  grooming_date: string
  duration_mins: number
  services_done: string[]
  ticks_found: number
  skin_condition: string | null
  coat_condition: string | null
  before_photo_url: string | null
  after_photo_url: string | null
  providers?: { name: string; is_verified: boolean }
}
interface WalkLog {
  id: string
  dog_id: string
  walker_name: string | null
  started_at: string
  duration_mins: number | null
  distance_km: number | null
  poop_count: number
  pee_count: number
  mood: string | null
  photo_url: string | null
  notes: string | null
  created_at: string
  dogs?: { name: string }
}
interface Props {
  broadcasts: Broadcast[]; reviews: Review[]
  savedProviders: SavedProvider[]; bookingRequests: BookingRequest[]
  claimedReports: ClaimedReport[]
  claimedGroomingReports: ClaimedGroomingReport[]
  walkLogs: WalkLog[]
  userDisplay: string; userAvatar?: string | null; userId: string
}

const SERVICE_LABELS: Record<string, string> = {
  'dog-walking': '🦮 Dog Walking', 'grooming': '✂️ Grooming',
  'vet': '🏥 Vet', 'pet-store': '🏪 Pet Store',
  'dog-training': '🎓 Dog Training', 'insurance': '🛡️ Insurance',
}
const CAT_ICONS: Record<string, string> = {
  'dog-walking': '🦮', 'grooming': '✂️', 'vet': '🏥',
  'pet-store': '🏪', 'dog-training': '🎓', 'insurance': '🛡️',
}
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#F0FDF4', color: '#15803D' },
  filled:    { bg: '#EFF6FF', color: '#1D4ED8' },
  confirmed: { bg: '#F0FDF4', color: '#15803D' },
  declined:  { bg: '#FFF1F2', color: '#BE123C' },
  pending:   { bg: '#FFFBEB', color: '#92400E' },
  closed:    { bg: '#F8FAFC', color: '#64748B' },
}
const EASE = [0.25, 0.46, 0.45, 0.94] as const

const SERVICE_NAMES: Record<string, string> = {
  bath: 'Bath', blow_dry: 'Blow Dry', ear_clean: 'Ear Clean',
  teeth_brush: 'Teeth Brush', tick_shampoo: 'Tick Shampoo',
  nail_clip: 'Nail Clip', haircut: 'Haircut', de_shedding: 'De-shedding',
  paw_massage: 'Paw Massage',
}
const CONDITION_STYLE: Record<string, { bg: string; color: string }> = {
  normal: { bg: '#F0FDF4', color: '#15803D' },
  shiny:  { bg: '#F0FDF4', color: '#15803D' },
  healthy:{ bg: '#F0FDF4', color: '#15803D' },
  clean:  { bg: '#F0FDF4', color: '#15803D' },
  dry:    { bg: '#FFFBEB', color: '#92400E' },
  dull:   { bg: '#FFFBEB', color: '#92400E' },
  irritated: { bg: '#FFF1F2', color: '#BE123C' },
  infected:  { bg: '#FFF1F2', color: '#BE123C' },
}

type Tab = 'broadcasts' | 'saved' | 'reviews' | 'bookings' | 'grooming'
const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'broadcasts', label: 'Broadcasts', emoji: '📣' },
  { id: 'saved',      label: 'Saved',      emoji: '❤️' },
  { id: 'reviews',    label: 'Reviews',    emoji: '⭐' },
  { id: 'bookings',   label: 'Walk Reports', emoji: '🐕' },
  { id: 'grooming',   label: 'Grooming',   emoji: '✂️' },
]

function EmptyState({ emoji, title, sub, cta, ctaHref }: {
  emoji: string; title: string; sub: string; cta?: string; ctaHref?: string
}) {
  return (
    <div className="flex flex-col items-center py-12 px-4 text-center">
      <span className="text-4xl mb-3">{emoji}</span>
      <p className="font-semibold text-slate-900 mb-1">{title}</p>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">{sub}</p>
      {cta && ctaHref && (
        <a
          href={ctaHref}
          className="px-5 py-2.5 rounded-2xl font-bold text-sm transition-all"
          style={{
            background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
            color: '#451A03',
            boxShadow: '0 4px 0px rgba(175,65,10,0.28)',
          }}
        >
          {cta}
        </a>
      )}
    </div>
  )
}

export default function MyAccountClient({
  broadcasts: initialBroadcasts, reviews, savedProviders: initialSaved, bookingRequests,
  claimedReports, claimedGroomingReports, walkLogs,
  userDisplay, userAvatar,
}: Props) {
  const [tab, setTab] = useState<Tab>('broadcasts')
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(initialBroadcasts)
  const [savedProviders, setSavedProviders] = useState<SavedProvider[]>(initialSaved)
  const [displayName, setDisplayName] = useState(userDisplay)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(userDisplay)
  const [savingName, setSavingName] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    fetch('/api/customer/saved')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSavedProviders(data)
          localStorage.setItem('pawlocal_saved', JSON.stringify(data))
        } else {
          try {
            const local = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]')
            if (Array.isArray(local)) setSavedProviders(local)
          } catch { /**/ }
        }
      })
      .catch(() => {
        try {
          const local = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]')
          if (Array.isArray(local)) setSavedProviders(local)
        } catch { /**/ }
      })
  }, [])

  function removeSaved(id: string) {
    const updated = savedProviders.filter(p => p.id !== id)
    setSavedProviders(updated)
    localStorage.setItem('pawlocal_saved', JSON.stringify(updated))
    fetch(`/api/customer/saved/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  async function handleSaveName() {
    if (!nameInput.trim() || nameInput.trim() === displayName) { setEditingName(false); return }
    setSavingName(true)
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } })
    setDisplayName(nameInput.trim())
    setSavingName(false)
    setEditingName(false)
  }

  async function closeBroadcast(id: string) {
    // Optimistic remove
    setBroadcasts(prev => prev.filter(b => b.id !== id))
    fetch(`/api/broadcasts/${id}`, { method: 'DELETE' }).catch(() => {
      // Restore on failure
      setBroadcasts(initialBroadcasts)
    })
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const counts: Record<Tab, number> = {
    broadcasts: broadcasts.length,
    saved: savedProviders.length,
    reviews: reviews.length,
    bookings: claimedReports.length + walkLogs.length,
    grooming: claimedGroomingReports.length,
  }

  return (
    <div className="max-w-lg mx-auto pb-20">

      {/* ── Profile section ── */}
      <div
        className="rounded-3xl p-5 mb-6"
        style={{
          background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
          boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -3px 0 rgba(0,0,0,0.06), 0 10px 28px rgba(15,45,50,0.08)',
          border: '1px solid rgba(226,220,200,0.7)',
        }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatar} alt={displayName}
              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{
                background: 'linear-gradient(145deg, oklch(0.52 0.17 196 / 0.15) 0%, oklch(0.48 0.17 196 / 0.25) 100%)',
                color: 'oklch(0.48 0.17 196)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 12px oklch(0.48 0.17 196 / 0.15)',
              }}
            >
              {initials}
            </div>
          )}

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text" value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="flex-1 text-sm font-semibold border-2 border-[var(--pl-teal)] rounded-xl px-3 py-1.5 outline-none bg-white"
                  autoFocus maxLength={60}
                />
                <button onClick={handleSaveName} disabled={savingName}
                  className="text-xs font-bold text-[var(--pl-teal)] disabled:opacity-50">
                  {savingName ? '…' : 'Save'}
                </button>
                <button onClick={() => { setEditingName(false); setNameInput(displayName) }}
                  className="text-xs text-slate-400">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-slate-900 truncate">{displayName}</p>
                <button onClick={() => { setEditingName(true); setNameInput(displayName) }}
                  className="text-slate-300 hover:text-slate-500 transition-colors text-sm flex-shrink-0" title="Edit name">
                  ✏️
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: '#F0FDF4', color: '#15803D' }}>
                ✓ Signed in
              </span>
              <span className="text-xs text-slate-400">Pet owner</span>
            </div>
          </div>

          {/* Sign out */}
          <button onClick={handleSignOut} disabled={signingOut}
            className="flex-shrink-0 text-xs text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50 flex flex-col items-center gap-0.5">
            <span className="text-base">→</span>
            <span>{signingOut ? '…' : 'Out'}</span>
          </button>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 mb-5"
        style={{ scrollbarWidth: 'none' } as React.CSSProperties}
      >
        {TABS.map(t => {
          const active = tab === t.id
          const count = counts[t.id]
          return (
            <motion.button
              key={t.id}
              onClick={() => setTab(t.id)}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all"
              style={active ? {
                background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
                color: '#fff',
                borderRadius: 9999,
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.18), inset 0 -3px 0 oklch(0.36 0.14 198), 0 8px 20px oklch(0.48 0.17 196 / 0.35)',
              } : {
                background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                color: '#374151',
                borderRadius: 9999,
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.06)',
                border: '1px solid rgba(226,220,200,0.8)',
              }}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
              {count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={active
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { background: 'oklch(0.92 0.07 44)', color: '#451A03' }
                  }
                >
                  {count}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: EASE }}
        >

          {/* BROADCASTS */}
          {tab === 'broadcasts' && (
            <div className="flex flex-col gap-3">
              {broadcasts.length === 0 ? (
                <EmptyState emoji="📣" title="No broadcasts yet"
                  sub="Post a need and let verified providers reply directly on WhatsApp."
                  cta="Post a broadcast →" ctaHref="/broadcast" />
              ) : (
                <>
                  {broadcasts.map(b => {
                    const s = STATUS_STYLE[b.status] ?? STATUS_STYLE.closed
                    return (
                      <div key={b.id} className="rounded-2xl p-4"
                        style={{
                          background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                          boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
                          border: '1px solid rgba(226,220,200,0.7)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-slate-900 text-sm">
                            {SERVICE_LABELS[b.service_slug] ?? b.service_slug}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize"
                              style={{ background: s.bg, color: s.color }}>
                              {b.status}
                            </span>
                            {b.status === 'active' && (
                              <button
                                onClick={() => closeBroadcast(b.id)}
                                className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center"
                                title="Close broadcast"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-2 leading-relaxed">{b.pet_description}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span>📍 {b.area}</span>
                          <span>📅 {b.date_needed}</span>
                          {b.budget && <span>💰 {b.budget}</span>}
                          <span className="ml-auto">
                            {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  <a href="/broadcast"
                    className="text-center text-sm font-semibold py-3 rounded-2xl transition-colors"
                    style={{ color: 'var(--pl-teal)' }}>
                    + Post another
                  </a>
                </>
              )}
            </div>
          )}

          {/* SAVED */}
          {tab === 'saved' && (
            <div className="flex flex-col gap-3">
              {savedProviders.length === 0 ? (
                <EmptyState emoji="❤️" title="No saved providers"
                  sub="Tap ❤️ on any provider profile to save them here for quick access."
                  cta="Browse providers" ctaHref="/" />
              ) : (
                savedProviders.map(p => (
                  <div key={p.id} className="rounded-2xl p-4 flex items-center gap-3"
                    style={{
                      background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                      boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
                      border: '1px solid rgba(226,220,200,0.7)',
                    }}
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: '#FFFBEB', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.06)' }}>
                      {CAT_ICONS[p.category_slug] ?? '🐾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">{p.category_slug.replace(/-/g, ' ')}</p>
                    </div>
                    <a href={`/provider/${p.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
                      style={{ color: 'var(--pl-teal)', background: 'oklch(0.48 0.17 196 / 0.08)' }}>
                      View
                    </a>
                    <button onClick={() => removeSaved(p.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 text-sm"
                      title="Remove">✕</button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* REVIEWS */}
          {tab === 'reviews' && (
            <div className="flex flex-col gap-3">
              {reviews.length === 0 ? (
                <EmptyState emoji="⭐" title="No reviews yet"
                  sub="After visiting a provider, leave a review to help the Juhu pet community." />
              ) : (
                reviews.map(r => (
                  <div key={r.id} className="rounded-2xl p-4"
                    style={{
                      background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                      boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
                      border: '1px solid rgba(226,220,200,0.7)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <a href={`/provider/${r.provider_id}`}
                          className="text-sm font-semibold text-slate-900 hover:text-[var(--pl-teal)] transition-colors">
                          {r.providers?.name ?? 'Provider'}
                        </a>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="text-sm" style={{ color: i < r.rating ? 'oklch(0.68 0.18 44)' : '#E2E8F0' }}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {r.comment && <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* GROOMING REPORTS */}
          {tab === 'grooming' && (
            <div className="flex flex-col gap-4">
              {claimedGroomingReports.length === 0 ? (
                <EmptyState
                  emoji="✂️"
                  title="No grooming reports yet"
                  sub="When your groomer sends a report after the session, it will appear here."
                />
              ) : (
                <>
                  {/* Summary card */}
                  <div className="rounded-2xl p-4" style={{
                    background: 'linear-gradient(135deg, #FDF4FF 0%, #FAF0FF 100%)',
                    border: '1.5px solid #E9D5FF',
                  }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 mb-3">
                      {claimedGroomingReports[0]?.dog_name}&apos;s grooming history
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { icon: '✂️', value: claimedGroomingReports.length, label: 'Sessions' },
                        { icon: '🪲', value: claimedGroomingReports.reduce((s, r) => s + (r.ticks_found ?? 0), 0), label: 'Ticks found' },
                        { icon: '⏱', value: `${claimedGroomingReports.reduce((s, r) => s + r.duration_mins, 0)}m`, label: 'Total time' },
                      ].map(s => (
                        <div key={s.label}>
                          <p className="text-lg">{s.icon}</p>
                          <p className="text-base font-bold text-slate-900 leading-tight">{s.value}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Report history feed */}
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-0.5">Grooming history</p>
                  {claimedGroomingReports.map(r => (
                    <a
                      key={r.id}
                      href={`/grooming-report/${r.token}`}
                      className="rounded-2xl overflow-hidden flex gap-3 items-center p-3 transition-transform active:scale-[0.99]"
                      style={{
                        background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 4px 12px rgba(15,45,50,0.06)',
                        border: '1px solid rgba(226,220,200,0.7)',
                      }}
                    >
                      {/* Before/after photo or emoji */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-purple-50 flex items-center justify-center text-2xl">
                        {r.after_photo_url
                          ? <img src={r.after_photo_url} alt={r.dog_name} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                          : r.before_photo_url
                          ? <img src={r.before_photo_url} alt={r.dog_name} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                          : '✂️'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <p className="font-semibold text-slate-900 text-sm truncate">{r.dog_name}</p>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {new Date(r.grooming_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        {r.providers && (
                          <p className="text-[10px] text-slate-400 mb-1">by {r.providers.name}{r.providers.is_verified ? ' ✓' : ''}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-slate-500">⏱ {r.duration_mins}m</span>
                          {r.ticks_found > 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#FFF1F2', color: '#BE123C' }}>
                              🪲 {r.ticks_found} tick{r.ticks_found > 1 ? 's' : ''}
                            </span>
                          )}
                          {r.coat_condition && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize"
                              style={CONDITION_STYLE[r.coat_condition] ?? { bg: '#F8FAFC', color: '#64748B' }}>
                              coat: {r.coat_condition}
                            </span>
                          )}
                        </div>
                        {r.services_done?.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate">
                            {r.services_done.map(s => SERVICE_NAMES[s] ?? s).join(' · ')}
                          </p>
                        )}
                      </div>

                      <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  ))}
                </>
              )}
            </div>
          )}

          {/* WALK REPORTS */}
          {tab === 'bookings' && (
            <div className="flex flex-col gap-4">
              {claimedReports.length === 0 && walkLogs.length === 0 ? (
                <EmptyState
                  emoji="🐕"
                  title="No walk reports yet"
                  sub="When your dog walker shares a walk report, it will appear here. Set up your QR code at /setup to start tracking walks."
                />
              ) : (() => {
                // ── Stats from pro reports (last 30 days) ──
                const last30 = claimedReports.filter(r =>
                  new Date(r.walk_date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                )
                const wlLast30 = walkLogs.filter(r =>
                  new Date(r.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                )
                const totalPoops = last30.reduce((s, r) => s + r.poop_count, 0) + wlLast30.reduce((s, r) => s + r.poop_count, 0)
                const totalPees  = last30.reduce((s, r) => s + r.pee_count, 0)  + wlLast30.reduce((s, r) => s + r.pee_count, 0)
                const totalMins  = last30.reduce((s, r) => s + r.duration_mins, 0) + wlLast30.reduce((s, r) => s + (r.duration_mins ?? 0), 0)
                const totalKm    = last30.reduce((s, r) => s + (r.distance_meters ?? 0), 0) / 1000
                                 + wlLast30.reduce((s, r) => s + (r.distance_km ?? 0), 0)
                const totalWalks = last30.length + wlLast30.length
                const dogName    = claimedReports[0]?.dog_name ?? walkLogs[0]?.dogs?.name ?? 'your dog'
                const walkerName = claimedReports[0]?.providers?.name ?? walkLogs[0]?.walker_name ?? 'your walker'

                // Poop streak from pro reports
                let streak = 0
                for (const r of claimedReports) {
                  if (r.poop_count > 0) streak++
                  else break
                }

                return (
                  <>
                    {/* ── 30-day summary card ── */}
                    <div className="rounded-2xl p-4" style={{
                      background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
                      border: '1.5px solid #BBF7D0',
                    }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
                        {dogName}&apos;s last 30 days
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { icon: '🐾', value: totalWalks, label: 'Walks' },
                          { icon: '⏱', value: `${totalMins}m`, label: 'Total time' },
                          { icon: '💩', value: totalPoops, label: 'Poops' },
                          { icon: '💧', value: totalPees,  label: 'Pees' },
                        ].map(s => (
                          <div key={s.label}>
                            <p className="text-lg">{s.icon}</p>
                            <p className="text-base font-bold text-slate-900 leading-tight">{s.value}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      {totalKm > 0 && (
                        <p className="text-xs text-emerald-700 font-semibold mt-3 text-center">
                          📏 {totalKm.toFixed(1)} km walked this month
                        </p>
                      )}
                      {streak >= 3 && (
                        <p className="text-xs text-emerald-700 font-semibold mt-1 text-center">
                          🔥 {streak}-walk poop streak — healthy gut!
                        </p>
                      )}
                    </div>

                    {/* ── Vet summary ── */}
                    <details className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(226,220,200,0.7)' }}>
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer bg-white text-sm font-semibold text-slate-700 select-none">
                        <span>🏥 Vet summary (last 30 days)</span>
                        <span className="text-slate-400 text-xs">tap to expand</span>
                      </summary>
                      <div className="px-4 py-4 bg-slate-50 text-xs text-slate-600 leading-relaxed space-y-1 font-mono">
                        <p>Dog: {dogName}</p>
                        <p>Walker: {walkerName}</p>
                        <p>Period: last 30 days ({totalWalks} walks)</p>
                        <p>Avg walk duration: {totalWalks ? Math.round(totalMins / totalWalks) : 0} mins</p>
                        <p>Avg distance: {totalWalks ? (totalKm / totalWalks).toFixed(2) : 0} km/walk</p>
                        <p>Total poops: {totalPoops} ({totalWalks ? (totalPoops / totalWalks).toFixed(1) : 0}/walk avg)</p>
                        <p>Total pees: {totalPees} ({totalWalks ? (totalPees / totalWalks).toFixed(1) : 0}/walk avg)</p>
                        <p className="pt-1 text-slate-400">Generated by PupStep · {new Date().toLocaleDateString('en-IN')}</p>
                      </div>
                    </details>

                    {/* ── Pro walk reports ── */}
                    {claimedReports.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-0.5">Walk reports (verified providers)</p>
                        {claimedReports.map(r => (
                          <a
                            key={r.id}
                            href={`/walk-report/${r.token}`}
                            className="rounded-2xl overflow-hidden flex gap-3 items-center p-3 transition-transform active:scale-[0.99]"
                            style={{
                              background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 4px 12px rgba(15,45,50,0.06)',
                              border: '1px solid rgba(226,220,200,0.7)',
                            }}
                          >
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 flex items-center justify-center text-2xl">
                              {r.photo_url
                                ? <img src={r.photo_url} alt={r.dog_name} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                                : '🐕'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1 mb-0.5">
                                <p className="font-semibold text-slate-900 text-sm truncate">{r.dog_name}</p>
                                <span className="text-[10px] text-slate-400 flex-shrink-0">
                                  {new Date(r.walk_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                              {r.providers && (
                                <p className="text-[10px] text-slate-400 mb-1">by {r.providers.name}{r.providers.is_verified ? ' ✓' : ''}</p>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span>⏱ {r.duration_mins}m</span>
                                {r.distance_meters && r.distance_meters > 0 && (
                                  <span>📏 {r.distance_meters >= 1000 ? `${(r.distance_meters / 1000).toFixed(1)}km` : `${Math.round(r.distance_meters)}m`}</span>
                                )}
                                {r.poop_count > 0 && <span>💩 {r.poop_count}</span>}
                                {r.pee_count > 0 && <span>💧 {r.pee_count}</span>}
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </a>
                        ))}
                      </>
                    )}

                    {/* ── Informal walker logs ── */}
                    {walkLogs.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-0.5">Walk logs (informal walkers)</p>
                        {walkLogs.map(r => (
                          <div
                            key={r.id}
                            className="rounded-2xl overflow-hidden flex gap-3 items-center p-3"
                            style={{
                              background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 4px 12px rgba(15,45,50,0.06)',
                              border: '1px solid rgba(226,220,200,0.7)',
                            }}
                          >
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-amber-50 flex items-center justify-center text-2xl">
                              {r.photo_url
                                ? <img src={r.photo_url} alt={r.dogs?.name ?? 'dog'} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                                : '🐕'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1 mb-0.5">
                                <p className="font-semibold text-slate-900 text-sm truncate">{r.dogs?.name ?? 'Dog'}</p>
                                <span className="text-[10px] text-slate-400 flex-shrink-0">
                                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                              {r.walker_name && (
                                <p className="text-[10px] text-slate-400 mb-1">by {r.walker_name}</p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
                                {r.duration_mins && <span>⏱ {r.duration_mins}m</span>}
                                {r.distance_km && r.distance_km > 0 && <span>📏 {r.distance_km.toFixed(1)}km</span>}
                                {r.poop_count > 0 && <span>💩 {r.poop_count}</span>}
                                {r.pee_count > 0 && <span>💧 {r.pee_count}</span>}
                                {r.mood && <span className="capitalize">😊 {r.mood}</span>}
                              </div>
                              {r.notes && (
                                <p className="text-[10px] text-slate-400 mt-1 truncate">{r.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )
              })()}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Footer: browse CTA ── */}
      <div className="mt-10 pt-6 border-t border-border/50 flex flex-col gap-2">
        <a href="/"
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all"
          style={{
            background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2.5px 0 rgba(0,0,0,0.05), 0 6px 16px rgba(0,0,0,0.06)',
            border: '1px solid rgba(226,220,200,0.8)',
            color: '#374151',
          }}
        >
          🐾 Back to home
        </a>
        <a href="/broadcast"
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all"
          style={{
            background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
            color: '#451A03',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.45), inset 0 -4px 0 rgba(175,65,10,0.30), 0 10px 28px rgba(245,110,35,0.48)',
          }}
        >
          📣 Post a broadcast
        </a>
      </div>

    </div>
  )
}
