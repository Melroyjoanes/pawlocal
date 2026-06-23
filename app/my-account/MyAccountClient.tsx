'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import TrialBanner from '@/components/TrialBanner'
import ParentBottomNav from '@/components/ParentBottomNav'

interface Broadcast {
  id: string; service_slug: string; pet_description: string
  area: string; date_needed: string; budget: string | null
  status: string; created_at: string
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
interface Dog {
  id: string; name: string; breed: string | null; photo_url: string | null; health_notes: string | null
}
interface WalkerConnection {
  id: string; dog_id: string; walker_name: string; walker_phone: string | null; walker_role: string | null; status: string; claimed_at: string | null; dogs?: { name: string }
}
interface Props {
  broadcasts: Broadcast[]
  claimedReports: ClaimedReport[]
  claimedGroomingReports: ClaimedGroomingReport[]
  walkLogs: WalkLog[]
  dogs: Dog[]
  walkerConnections: WalkerConnection[]
  userDisplay: string; userAvatar?: string | null; userId: string
  subStatus: {
    status: 'trial' | 'active' | 'expired' | 'no_trial'
    trial_days_remaining: number | null
    expires_at: string | null
  } | null
}

const SERVICE_LABELS: Record<string, string> = {
  'dog-walking': '🦮 Dog Walking', 'grooming': '✂️ Grooming',
  'vet': '🏥 Vet', 'pet-store': '🏪 Pet Store',
  'dog-training': '🎓 Dog Training',
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

interface BillingRow {
  id: string
  plan: string
  status: string
  amount_paise: number
  expires_at: string | null
  created_at: string
  razorpay_payment_id: string | null
}

type Tab = 'dogs' | 'team' | 'bookings' | 'grooming' | 'plan'
const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'dogs',       label: 'My Dogs',      emoji: '🐕' },
  { id: 'team',       label: 'My Team',      emoji: '👥' },
  { id: 'bookings',   label: 'Walk Reports', emoji: '🐾' },
  { id: 'grooming',   label: 'Grooming',     emoji: '✂️' },
  { id: 'plan',       label: 'Plan & Billing', emoji: '💳' },
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
  broadcasts: initialBroadcasts,
  claimedReports, claimedGroomingReports, walkLogs,
  dogs, walkerConnections,
  userDisplay, userAvatar, subStatus,
}: Props) {
  const [tab, setTab] = useState<Tab>('dogs')
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(initialBroadcasts)
  const [displayName, setDisplayName] = useState(userDisplay)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(userDisplay)
  const [savingName, setSavingName] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Plan & Billing state
  const [billingHistory, setBillingHistory] = useState<BillingRow[]>([])
  const [billingLoading, setBillingLoading] = useState(false)
  const [cancellingPlan, setCancellingPlan] = useState(false)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  useEffect(() => {
    if (tab === 'plan' && billingHistory.length === 0 && !billingLoading) {
      setBillingLoading(true)
      fetch('/api/payments/billing-history')
        .then(r => r.json())
        .then(d => { setBillingHistory(d.history ?? []) })
        .catch(() => {})
        .finally(() => setBillingLoading(false))
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCancelPlan() {
    const activeSub = subStatus?.status === 'active'
    if (!activeSub) return
    const expiryStr = subStatus?.expires_at
      ? new Date(subStatus.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'your plan end date'
    const confirmed = window.confirm(`Cancel your PupStep subscription? You keep access until ${expiryStr}.`)
    if (!confirmed) return
    setCancellingPlan(true)
    try {
      const res = await fetch('/api/payments/cancel', { method: 'POST' })
      if (res.ok) {
        setCancelSuccess(true)
      }
    } catch {
      // silent fail — user can retry
    } finally {
      setCancellingPlan(false)
    }
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
    window.location.href = '/?signed_out=1'
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setDeleteError(data.error ?? 'Something went wrong. Please try again.')
        setDeleting(false)
        return
      }
      await fetch('/api/auth/signout', { method: 'POST' })
      window.location.href = '/?deleted=1'
    } catch {
      setDeleteError('Network error. Please try again.')
      setDeleting(false)
    }
  }

  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const counts: Record<Tab, number> = {
    dogs: dogs.length,
    team: walkerConnections.filter(w => w.status === 'active').length,
    bookings: claimedReports.length + walkLogs.length,
    grooming: claimedGroomingReports.length,
    plan: 0,
  }

  return (
    <div className="min-h-dvh" style={{ background: '#FFFBEB' }}>

      {/* ── App header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#FFFBEB]" style={{ borderBottom: '1px solid oklch(0.906 0.06 88)' }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/home">
            <Image src="/logo.webp" alt="PupStep" width={130} height={48} className="h-9 w-auto" priority />
          </Link>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Account</span>
        </div>
      </header>

    <div className="max-w-lg mx-auto px-4 pb-28 pt-5">

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

        </div>

        {/* Sign out + Delete account row */}
        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgba(226,220,200,0.6)' }}>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            style={{ background: '#F1F5F9', color: '#475569' }}
          >
            <span>→</span>
            <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ml-auto"
            style={{ background: '#FFF1F2', color: '#BE123C' }}
          >
            <span>🗑</span>
            <span>Delete account</span>
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

          {/* MY DOGS */}
          {tab === 'dogs' && (
            dogs.length === 0
              ? <EmptyState emoji="🐕" title="No dogs set up yet" sub="Add your dog to start tracking walks and grooming." cta="Set up my dog" ctaHref="/setup" />
              : <div className="space-y-3">
                  {dogs.map(dog => (
                    <div key={dog.id} className="rounded-2xl p-4 flex items-center gap-4"
                      style={{ background: 'linear-gradient(160deg,#ffffff 0%,#fffdf7 100%)', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), 0 4px 16px rgba(15,45,50,0.07)', border: '1px solid rgba(226,220,200,0.7)' }}>
                      <div className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden"
                        style={{ background: '#FF8C52' }}>
                        {dog.photo_url
                          ? <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🐕</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-base">{dog.name}</p>
                        {dog.breed && <p className="text-xs text-slate-500 mt-0.5">{dog.breed}</p>}
                        {dog.health_notes && (
                          <p className="text-xs text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded-lg">⚠️ {dog.health_notes}</p>
                        )}
                      </div>
                      <a href="/setup" className="text-xs font-bold text-teal-600 flex-shrink-0">Edit →</a>
                    </div>
                  ))}
                  <a href="/setup"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold mt-2"
                    style={{ background: 'linear-gradient(160deg,#FF8C52 0%,#F56B22 100%)', color: '#451A03', boxShadow: '0 4px 0 rgba(175,65,10,0.28)' }}>
                    + Add another dog
                  </a>
                </div>
          )}

          {/* MY TEAM */}
          {tab === 'team' && (
            walkerConnections.length === 0
              ? <EmptyState emoji="👥" title="No walkers connected yet" sub="Share your dog's QR code with whoever walks your dog." cta="Set up my dog" ctaHref="/setup" />
              : <div className="space-y-3">
                  {walkerConnections.map(wc => (
                    <div key={wc.id} className="rounded-2xl p-4"
                      style={{ background: 'linear-gradient(160deg,#ffffff 0%,#fffdf7 100%)', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), 0 4px 16px rgba(15,45,50,0.07)', border: '1px solid rgba(226,220,200,0.7)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: wc.status === 'active' ? '#D1FAE5' : '#F1F5F9' }}>
                          {wc.status === 'active' ? '✅' : '⏳'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{wc.walker_name}</p>
                          <p className="text-xs text-slate-500">{wc.walker_role?.replace('_', ' ') ?? 'Walker'} · {wc.dogs?.name ?? ''}</p>
                        </div>
                        {wc.walker_phone && (
                          <a href={`https://wa.me/91${wc.walker_phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                            style={{ background: '#25D366' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
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
                    <div key={r.id} className="relative">
                      <div className={subStatus?.status === 'expired' ? 'blur-sm pointer-events-none select-none' : ''}>
                        <a
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
                      </div>
                      {subStatus?.status === 'expired' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-2xl">
                          <span className="text-2xl mb-1">🔒</span>
                          <p className="text-white text-sm font-semibold mb-2">Subscribe to view</p>
                          <a href="/upgrade" className="bg-[#FF8C52] text-white text-xs font-bold px-4 py-2 rounded-full">
                            Upgrade ₹249/mo
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* WALK REPORTS */}
          {tab === 'bookings' && (
            <div className="flex flex-col gap-4">
              {subStatus && (
                <TrialBanner
                  status={subStatus.status}
                  trialDaysRemaining={subStatus.trial_days_remaining}
                  expiresAt={subStatus.expires_at}
                />
              )}
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
                          <div key={r.id} className="relative">
                            <div className={subStatus?.status === 'expired' ? 'blur-sm pointer-events-none select-none' : ''}>
                              <a
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
                            </div>
                            {subStatus?.status === 'expired' && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-2xl">
                                <span className="text-2xl mb-1">🔒</span>
                                <p className="text-white text-sm font-semibold mb-2">Subscribe to view</p>
                                <a href="/upgrade" className="bg-[#FF8C52] text-white text-xs font-bold px-4 py-2 rounded-full">
                                  Upgrade ₹249/mo
                                </a>
                              </div>
                            )}
                          </div>
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

          {/* PLAN & BILLING */}
          {tab === 'plan' && (() => {
            const isActive = subStatus?.status === 'active'
            const isExpired = subStatus?.status === 'expired'
            const hasPlan = isActive || isExpired
            const expiryStr = subStatus?.expires_at
              ? new Date(subStatus.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : null

            // Check billing history for a more detailed status (past_due/cancelled)
            const latestBill = billingHistory[0]
            const latestBillStatus = latestBill?.status

            const statusBadge = isActive
              ? { bg: '#F0FDF4', color: '#15803D', label: 'Active' }
              : latestBillStatus === 'past_due'
              ? { bg: '#FFF1F2', color: '#BE123C', label: 'Payment failed' }
              : { bg: '#F8FAFC', color: '#64748B', label: 'Cancelled' }

            return (
              <div className="flex flex-col gap-4">

                {/* Current plan card */}
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), 0 8px 24px -4px rgba(10,47,53,0.14), 0 32px 64px -12px rgba(10,47,53,0.10)',
                    border: '1px solid rgba(226,220,200,0.7)',
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Current Plan</p>

                  {subStatus && hasPlan ? (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900 text-lg capitalize" style={{ fontFamily: 'var(--font-fredoka)' }}>
                          PupStep Pro
                        </p>
                        {expiryStr && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {isActive ? 'Renews' : 'Access until'} {expiryStr}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
                        style={{ background: statusBadge.bg, color: statusBadge.color }}
                      >
                        {statusBadge.label}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-3">
                      <p className="text-sm text-slate-500">You don&apos;t have an active plan.</p>
                      <Link
                        href="/upgrade"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all"
                        style={{
                          background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
                          color: '#451A03',
                          boxShadow: '0 4px 0px rgba(175,65,10,0.28)',
                        }}
                      >
                        Upgrade to Pro
                      </Link>
                    </div>
                  )}

                  {/* Cancel button */}
                  {isActive && !cancelSuccess && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(226,220,200,0.6)' }}>
                      <button
                        onClick={handleCancelPlan}
                        disabled={cancellingPlan}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        style={{ background: '#F1F5F9', color: '#475569', border: '1px solid rgba(226,220,200,0.8)' }}
                      >
                        {cancellingPlan ? 'Cancelling…' : 'Cancel subscription'}
                      </button>
                    </div>
                  )}

                  {cancelSuccess && expiryStr && (
                    <div className="mt-4 rounded-xl px-3 py-2.5" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <p className="text-sm text-green-800 font-semibold">
                        Cancelled. Access continues until {expiryStr}.
                      </p>
                    </div>
                  )}
                </div>

                {/* Billing history */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-0.5 mb-3">Billing History</p>
                  {billingLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-slate-400 text-sm">Loading…</span>
                    </div>
                  ) : billingHistory.length === 0 ? (
                    <div
                      className="rounded-2xl p-5 text-center"
                      style={{
                        background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                        border: '1px solid rgba(226,220,200,0.7)',
                      }}
                    >
                      <p className="text-sm text-slate-400">No billing history yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {billingHistory.map(row => {
                        const rowStatus = row.status === 'active'
                          ? { bg: '#F0FDF4', color: '#15803D' }
                          : row.status === 'past_due'
                          ? { bg: '#FFF1F2', color: '#BE123C' }
                          : { bg: '#F8FAFC', color: '#64748B' }
                        return (
                          <div
                            key={row.id}
                            className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                            style={{
                              background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), 0 4px 12px rgba(15,45,50,0.06)',
                              border: '1px solid rgba(226,220,200,0.7)',
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 capitalize">{row.plan} plan</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {row.razorpay_payment_id && (
                                  <span className="ml-1.5 opacity-60">· {row.razorpay_payment_id.slice(0, 16)}…</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <p className="text-sm font-bold text-slate-900">
                                ₹{(row.amount_paise / 100).toLocaleString('en-IN')}
                              </p>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                                style={{ background: rowStatus.bg, color: rowStatus.color }}
                              >
                                {row.status === 'past_due' ? 'Failed' : row.status}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            )
          })()}

        </motion.div>
      </AnimatePresence>

      {/* ── Footer: quick links ── */}
      <div className="mt-10 pt-6 border-t border-border/50 flex flex-col gap-2">
        <a href="/home"
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all"
          style={{
            background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2.5px 0 rgba(0,0,0,0.05), 0 6px 16px rgba(0,0,0,0.06)',
            border: '1px solid rgba(226,220,200,0.8)',
            color: '#374151',
          }}
        >
          🏠 Go to my home
        </a>
        <a href="/setup"
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all"
          style={{
            background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
            color: '#451A03',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.45), inset 0 -4px 0 rgba(175,65,10,0.30), 0 10px 28px rgba(245,110,35,0.48)',
          }}
        >
          🐕 Set up / edit my dog
        </a>
      </div>

      {/* ── Delete account confirmation modal ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(10,47,53,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget && !deleting) setShowDeleteConfirm(false) }}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
              className="w-full max-w-sm rounded-3xl p-6"
              style={{
                background: '#FFFBEB',
                boxShadow: '0 24px 60px rgba(10,47,53,0.2), inset 0 1.5px 0 rgba(255,255,255,0.9)',
              }}
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <span className="text-2xl">🗑️</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-fredoka)' }}>
                Delete your account?
              </h2>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                This will permanently delete your account, all your broadcasts, reviews, saved providers, and walk reports. This cannot be undone.
              </p>

              {deleteError && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
                  <p className="text-sm text-red-700">{deleteError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                  style={{ background: '#F1F5F9', color: '#475569', fontFamily: 'var(--font-fredoka)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(160deg, #F43F5E 0%, #BE123C 100%)',
                    color: '#fff',
                    fontFamily: 'var(--font-fredoka)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.2), inset 0 -3px 0 rgba(0,0,0,0.15)',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>

      <ParentBottomNav />
    </div>
  )
}
