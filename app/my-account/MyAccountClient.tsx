'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import ParentBottomNav from '@/components/ParentBottomNav'
import { parseCareFocus } from '@/lib/careFocus'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Broadcast {
  id: string; service_slug: string; pet_description: string
  area: string; date_needed: string; budget: string | null
  status: string; created_at: string
}
interface Dog {
  id: string
  name: string
  breed: string | null
  photo_url: string | null
  health_notes: string | null
  care_focus: string | null
}
interface WalkerConnection {
  id: string
  dog_id: string
  walker_name: string
  walker_phone: string | null
  walker_role: string | null
  status: string
  claimed_at: string | null
  token: string | null
  dogs?: { name: string }
}

interface Props {
  broadcasts: Broadcast[]
  claimedReports: unknown[]
  claimedGroomingReports: unknown[]
  walkLogs: unknown[]
  dogs: Dog[]
  walkerConnections: WalkerConnection[]
  userDisplay: string
  userAvatar?: string | null
  userEmail?: string | null
  userId: string
  profilePhone?: string | null
  notificationPreferences?: { report_email?: boolean; weekly_summary?: boolean }
  subStatus: {
    status: 'trial' | 'active' | 'expired' | 'no_trial'
    trial_days_remaining: number | null
    expires_at: string | null
  } | null
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

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = 'oklch(0.48 0.17 196)'

const CARE_FOCUS_OPTIONS = [
  { key: 'normal',   emoji: '🐾', label: 'Normal walk' },
  { key: 'stomach',  emoji: '💩', label: 'Stomach monitoring' },
  { key: 'recovery', emoji: '🩹', label: 'Recovery / injury' },
  { key: 'anxiety',  emoji: '😰', label: 'Anxiety / fear' },
  { key: 'senior',   emoji: '🐕', label: 'Senior dog' },
  { key: 'puppy',    emoji: '🐶', label: 'Puppy training' },
]

// ─── Small shared components ──────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-widest mb-3 px-0.5"
      style={{ color: TEAL, letterSpacing: '0.12em' }}
    >
      {children}
    </p>
  )
}

function SectionDivider() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(226,220,200,0.6)', margin: '24px 0' }} />
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), 0 4px 16px rgba(15,45,50,0.07)',
        border: '1px solid rgba(226,220,200,0.7)',
      }}
    >
      {children}
    </div>
  )
}

// iOS-style toggle
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: checked ? TEAL : '#D1D5DB',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 0.2s',
        outline: 'none',
        padding: 0,
        minWidth: 44,
        minHeight: 26,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'left 0.2s',
          display: 'block',
        }}
      />
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MyAccountClient({
  dogs,
  walkerConnections,
  userDisplay,
  userAvatar,
  userEmail,
  profilePhone,
  notificationPreferences,
  subStatus,
}: Props) {
  // ── Profile section state
  const [displayName, setDisplayName] = useState(userDisplay)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState(userDisplay)
  const [savingName, setSavingName]   = useState(false)

  const [phone, setPhone]         = useState(profilePhone ?? '')
  const [phoneInput, setPhoneInput] = useState(profilePhone ?? '')
  const [editingPhone, setEditingPhone] = useState(false)
  const [savingPhone, setSavingPhone]   = useState(false)

  // ── Dog edit sheet state
  const [editingDog, setEditingDog] = useState<Dog | null>(null)
  const [dogName, setDogName]             = useState('')
  const [dogBreed, setDogBreed]           = useState('')
  const [dogCareFocus, setDogCareFocus]   = useState('normal')
  const [dogHealthNotes, setDogHealthNotes]         = useState('')
  const [dogWalkingInstructions, setDogWalkingInstructions] = useState('')
  const [savingDog, setSavingDog]         = useState(false)

  // ── Subscription state
  const [billingHistory, setBillingHistory] = useState<BillingRow[]>([])
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingLoaded, setBillingLoaded]   = useState(false)
  const [cancellingPlan, setCancellingPlan] = useState(false)
  const [cancelSuccess, setCancelSuccess]   = useState(false)

  // ── Notification state
  const [notifReportEmail, setNotifReportEmail]     = useState(notificationPreferences?.report_email ?? true)
  const [notifWeeklySummary, setNotifWeeklySummary] = useState(notificationPreferences?.weekly_summary ?? true)
  const [savingNotif, setSavingNotif] = useState(false)

  // ── Global UI state
  const [signingOut, setSigningOut]             = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]                 = useState(false)
  const [deleteError, setDeleteError]           = useState<string | null>(null)

  // Load billing on mount (subscription section visible by default now)
  useEffect(() => {
    if (!billingLoaded && !billingLoading) {
      setBillingLoading(true)
      fetch('/api/payments/billing-history')
        .then(r => r.json())
        .then(d => { setBillingHistory(d.history ?? []) })
        .catch(() => {})
        .finally(() => { setBillingLoading(false); setBillingLoaded(true) })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  // ── Handlers ─────────────────────────────────────────────────────────────

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

  async function handleSavePhone() {
    setSavingPhone(true)
    try {
      await fetch('/api/profile/phone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput.trim() }),
      })
      setPhone(phoneInput.trim())
    } catch {
      // silent — user can retry
    } finally {
      setSavingPhone(false)
      setEditingPhone(false)
    }
  }

  function openDogEdit(dog: Dog) {
    setEditingDog(dog)
    setDogName(dog.name)
    setDogBreed(dog.breed ?? '')
    setDogCareFocus(dog.care_focus ?? 'normal')
    setDogHealthNotes(dog.health_notes ?? '')
    // walking_instructions stored in health_notes
  }

  async function handleSaveDog() {
    if (!editingDog) return
    setSavingDog(true)
    try {
      await fetch(`/api/dogs/${editingDog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dogName.trim(),
          breed: dogBreed.trim() || null,
          care_focus: dogCareFocus,
          health_notes: dogHealthNotes.trim() || null,
          // walking_instructions stored in health_notes
        }),
      })
      // Update local dogs list optimistically — page will refresh on next navigation
    } catch {
      // silent
    } finally {
      setSavingDog(false)
      setEditingDog(null)
    }
  }

  async function handleSaveNotif(key: 'report_email' | 'weekly_summary', value: boolean) {
    setSavingNotif(true)
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
    } catch {
      // revert on failure
      if (key === 'report_email') setNotifReportEmail(!value)
      else setNotifWeeklySummary(!value)
    } finally {
      setSavingNotif(false)
    }
  }

  async function handleCancelPlan() {
    if (subStatus?.status !== 'active') return
    const expiryStr = subStatus?.expires_at
      ? new Date(subStatus.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'your plan end date'
    const confirmed = window.confirm(`Cancel your PupStep subscription? You keep access until ${expiryStr}.`)
    if (!confirmed) return
    setCancellingPlan(true)
    try {
      const res = await fetch('/api/payments/cancel', { method: 'POST' })
      if (res.ok) setCancelSuccess(true)
    } catch {
      // silent
    } finally {
      setCancellingPlan(false)
    }
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
        const data = await res.json() as { error?: string }
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

  // ── Derived subscription values ───────────────────────────────────────────

  const isActive  = subStatus?.status === 'active'
  const isExpired = subStatus?.status === 'expired'
  const hasPlan   = isActive || isExpired
  const expiryStr = subStatus?.expires_at
    ? new Date(subStatus.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const latestBillStatus = billingHistory[0]?.status
  const statusBadge = isActive
    ? { bg: '#F0FDF4', color: '#15803D', label: 'Active' }
    : latestBillStatus === 'past_due'
    ? { bg: '#FFF1F2', color: '#BE123C', label: 'Payment failed' }
    : { bg: '#F8FAFC', color: '#64748B', label: 'Cancelled' }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh" style={{ background: '#FFFBEB' }}>

      {/* App header */}
      <header
        className="sticky top-0 z-40 bg-[#FFFBEB]"
        style={{ borderBottom: '1px solid oklch(0.906 0.06 88)' }}
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/home">
            <Image src="/logo.webp" alt="PupStep" width={130} height={48} className="h-9 w-auto" priority />
          </Link>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Account</span>
        </div>
      </header>

      {/* ── Scroll body ── */}
      <div className="max-w-[480px] mx-auto px-4 pb-32 pt-6">

        {/* ════════════════════════════════════════════════════════════════
            SECTION 1: PROFILE
        ════════════════════════════════════════════════════════════════ */}
        <SectionHeader>Profile</SectionHeader>

        <Card>
          {/* Avatar row */}
          <div className="flex items-center gap-4 mb-4">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatar}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{
                  background: 'linear-gradient(145deg, oklch(0.52 0.17 196 / 0.15) 0%, oklch(0.48 0.17 196 / 0.25) 100%)',
                  color: TEAL,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 12px oklch(0.48 0.17 196 / 0.15)',
                  fontFamily: 'var(--font-fredoka)',
                }}
              >
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* Display name */}
              {editingName ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') { setEditingName(false); setNameInput(displayName) }
                    }}
                    className="flex-1 text-sm font-semibold border-2 rounded-xl px-3 py-1.5 outline-none bg-white"
                    style={{ borderColor: TEAL, fontFamily: 'var(--font-nunito)' }}
                    autoFocus
                    maxLength={60}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="text-xs font-bold disabled:opacity-50"
                    style={{ color: TEAL, minHeight: 44, minWidth: 44 }}
                  >
                    {savingName ? '…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setNameInput(displayName) }}
                    className="text-xs text-slate-400"
                    style={{ minHeight: 44, minWidth: 44 }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-bold text-slate-900 truncate" style={{ fontFamily: 'var(--font-fredoka)', fontSize: 18 }}>
                    {displayName}
                  </p>
                  <button
                    onClick={() => { setEditingName(true); setNameInput(displayName) }}
                    className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
                    style={{ minHeight: 44, minWidth: 44, fontSize: 14 }}
                    title="Edit name"
                  >
                    ✏️
                  </button>
                </div>
              )}
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: '#F0FDF4', color: '#15803D' }}
              >
                Pet owner
              </span>
            </div>
          </div>

          {/* Email (read-only) */}
          {userEmail && (
            <div className="mb-3">
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: '#94A3B8', letterSpacing: '0.1em' }}
              >
                Sign-in email · cannot be changed
              </p>
              <p className="text-sm text-slate-400" style={{ fontFamily: 'var(--font-nunito)' }}>
                {userEmail}
              </p>
            </div>
          )}

          {/* WhatsApp number */}
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: '#94A3B8', letterSpacing: '0.1em' }}
            >
              WhatsApp number
            </p>
            {editingPhone ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold text-slate-500 flex-shrink-0"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSavePhone()
                    if (e.key === 'Escape') { setEditingPhone(false); setPhoneInput(phone) }
                  }}
                  className="flex-1 text-sm border-2 rounded-xl px-3 py-1.5 outline-none bg-white"
                  style={{ borderColor: TEAL, fontFamily: 'var(--font-nunito)', minHeight: 44 }}
                  maxLength={10}
                  placeholder="10-digit number"
                  autoFocus
                />
                <button
                  onClick={handleSavePhone}
                  disabled={savingPhone}
                  className="text-xs font-bold disabled:opacity-50"
                  style={{ color: TEAL, minHeight: 44, minWidth: 44 }}
                >
                  {savingPhone ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingPhone(false); setPhoneInput(phone) }}
                  className="text-xs text-slate-400"
                  style={{ minHeight: 44, minWidth: 44 }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p
                  className="text-sm text-slate-700"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {phone ? `+91 ${phone}` : <span className="text-slate-400 italic">Not set</span>}
                </p>
                <button
                  onClick={() => { setEditingPhone(true); setPhoneInput(phone) }}
                  className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
                  style={{ minHeight: 44, minWidth: 44, fontSize: 14 }}
                  title="Edit WhatsApp number"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>
        </Card>

        <SectionDivider />

        {/* ════════════════════════════════════════════════════════════════
            SECTION 2: DOGS
        ════════════════════════════════════════════════════════════════ */}
        <SectionHeader>My Dogs</SectionHeader>

        {dogs.length === 0 ? (
          <Card>
            <div className="text-center py-6">
              <p className="text-3xl mb-2">🐕</p>
              <p className="font-semibold text-slate-700 mb-1" style={{ fontFamily: 'var(--font-fredoka)' }}>No dogs set up yet</p>
              <p className="text-xs text-slate-400 mb-4">Add your dog to start tracking walks.</p>
              <a
                href="/setup?go=1"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm"
                style={{
                  background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
                  color: '#451A03',
                  boxShadow: '0 4px 0 rgba(175,65,10,0.28)',
                  minHeight: 44,
                }}
              >
                Set up my dog
              </a>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {dogs.map(dog => {
              const dogFocusKeys = parseCareFocus(dog.care_focus)
              const focuses = CARE_FOCUS_OPTIONS.filter(o => dogFocusKeys.includes(o.key))
              return (
                <Card key={dog.id} className="flex items-center gap-3">
                  {/* Dog photo */}
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: '#FF8C52', minWidth: 40, minHeight: 40 }}
                  >
                    {dog.photo_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
                      : <span className="text-lg">🐕</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-bold text-slate-900 truncate"
                      style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16 }}
                    >
                      {dog.name}
                    </p>
                    {dog.breed && (
                      <p className="text-xs text-slate-500">{dog.breed}</p>
                    )}
                    {focuses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {focuses.map(focus => (
                          <span
                            key={focus.key}
                            className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: 'oklch(0.48 0.17 196 / 0.10)',
                              color: TEAL,
                            }}
                          >
                            {focus.emoji} {focus.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Walker status */}
                    {(() => {
                      const hasWalker = walkerConnections.some(c => c.dog_id === dog.id && c.status === 'active')
                      return (
                        <div className="mt-1">
                          {hasWalker ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', fontFamily: 'var(--font-nunito)' }}>✅ Walker connected</span>
                          ) : (
                            <a href={`/setup/qr?dog=${dog.id}`} style={{ fontSize: 10, fontWeight: 700, color: '#FF8C52', fontFamily: 'var(--font-nunito)', textDecoration: 'none' }}>
                              ⚠️ No walker · Connect one →
                            </a>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openDogEdit(dog)}
                      className="text-[11px] font-bold px-3 rounded-xl"
                      style={{
                        background: 'oklch(0.48 0.17 196 / 0.10)',
                        color: TEAL,
                        minHeight: 44,
                        minWidth: 44,
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </Card>
              )
            })}

            <a
              href="/setup?go=1"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold"
              style={{
                background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
                color: '#451A03',
                boxShadow: '0 4px 0 rgba(175,65,10,0.28)',
                minHeight: 44,
              }}
            >
              + Add another dog
            </a>
          </div>
        )}

        <SectionDivider />

        {/* ════════════════════════════════════════════════════════════════
            SECTION 3: WALKERS
        ════════════════════════════════════════════════════════════════ */}
        <SectionHeader>My Walkers</SectionHeader>

        {walkerConnections.length === 0 ? (
          <Card>
            <div className="text-center py-6">
              <p className="text-3xl mb-2">🦮</p>
              <p className="font-semibold text-slate-700 mb-1" style={{ fontFamily: 'var(--font-fredoka)' }}>No walkers connected yet</p>
              <p className="text-xs text-slate-400 mb-4">Share your QR code with your dog walker to start getting GPS reports.</p>
              <a
                href={dogs.length > 0 ? `/setup/qr?dog=${dogs[0].id}` : '/setup?go=1'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm"
                style={{ background: 'oklch(0.48 0.17 196)', color: '#fff', textDecoration: 'none', minHeight: 44, fontFamily: 'var(--font-nunito)' }}
              >
                Connect a walker →
              </a>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {walkerConnections.map(wc => {
              const isActive = wc.status === 'active'
              const dogName  = dogs.find(d => d.id === wc.dog_id)?.name ?? wc.dogs?.name ?? 'your dog'
              const shareUrl = wc.token
                ? `https://pupstep.in/connect/${wc.token}`
                : null
              const waShareText = shareUrl
                ? encodeURIComponent(`Log walks for ${dogName}: ${shareUrl}`)
                : null

              return (
                <Card key={wc.id} className={isActive ? '' : 'opacity-60'}>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: isActive ? '#D1FAE5' : '#F1F5F9', minWidth: 40, minHeight: 40 }}
                    >
                      {isActive ? '✅' : '⏳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate" style={{ fontFamily: 'var(--font-fredoka)' }}>
                        {wc.walker_name}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {wc.walker_role && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                            style={{ background: '#EFF6FF', color: '#1D4ED8' }}
                          >
                            {wc.walker_role.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">{dogName}</span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={isActive
                            ? { background: '#F0FDF4', color: '#15803D' }
                            : { background: '#F8FAFC', color: '#94A3B8' }
                          }
                        >
                          {isActive ? 'Connected' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isActive && (
                    <p className="text-xs text-slate-400 italic mt-1">Waiting for walker to connect…</p>
                  )}

                  {isActive && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {wc.walker_phone && (
                        <a
                          href={`https://wa.me/91${wc.walker_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 rounded-xl text-[11px] font-bold text-white"
                          style={{ background: '#25D366', minHeight: 44 }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp {wc.walker_name.split(' ')[0]}
                        </a>
                      )}
                      {waShareText && (
                        <a
                          href={`https://wa.me/?text=${waShareText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 rounded-xl text-[11px] font-bold"
                          style={{ background: '#F0FDF4', color: '#15803D', minHeight: 44 }}
                        >
                          Share link
                        </a>
                      )}
                      <a
                        href={`/setup/qr?dog=${wc.dog_id}`}
                        className="flex items-center gap-1.5 px-3 rounded-xl text-[11px] font-bold"
                        style={{ background: '#F8FAFC', color: '#475569', minHeight: 44 }}
                      >
                        Show QR
                      </a>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        <SectionDivider />

        {/* ════════════════════════════════════════════════════════════════
            SECTION 4: SUBSCRIPTION
        ════════════════════════════════════════════════════════════════ */}
        <SectionHeader>Plan & Billing</SectionHeader>

        <div className="space-y-4">
          {/* Current plan card */}
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Current Plan</p>

            {subStatus && hasPlan ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p
                    className="font-bold text-slate-900 text-lg"
                    style={{ fontFamily: 'var(--font-fredoka)' }}
                  >
                    PupStep Pro
                  </p>
                  {expiryStr && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isActive ? 'Renews manually on' : 'Access until'} {expiryStr}
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
                  className="inline-flex items-center gap-2 px-5 rounded-2xl font-bold text-sm"
                  style={{
                    background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
                    color: '#451A03',
                    boxShadow: '0 4px 0px rgba(175,65,10,0.28)',
                    minHeight: 44,
                  }}
                >
                  Upgrade to Pro
                </Link>
              </div>
            )}

            {isActive && !cancelSuccess && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(226,220,200,0.6)' }}>
                <button
                  onClick={handleCancelPlan}
                  disabled={cancellingPlan}
                  className="flex items-center gap-2 px-4 rounded-xl text-xs font-bold disabled:opacity-50"
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid rgba(226,220,200,0.8)',
                    minHeight: 44,
                  }}
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
          </Card>

          {/* Billing history */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-0.5 mb-3">
              Billing History
            </p>
            {billingLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-slate-400 text-sm">Loading…</span>
              </div>
            ) : billingHistory.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-400 text-center py-2">No billing history yet.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {billingHistory.map(row => {
                  const rowStyle = row.status === 'active'
                    ? { bg: '#F0FDF4', color: '#15803D' }
                    : row.status === 'past_due'
                    ? { bg: '#FFF1F2', color: '#BE123C' }
                    : { bg: '#F8FAFC', color: '#64748B' }
                  return (
                    <Card key={row.id} className="flex items-center justify-between gap-3 py-3 px-4">
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
                          style={{ background: rowStyle.bg, color: rowStyle.color }}
                        >
                          {row.status === 'past_due' ? 'Failed' : row.status}
                        </span>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <SectionDivider />

        {/* ════════════════════════════════════════════════════════════════
            SECTION 5: NOTIFICATIONS
        ════════════════════════════════════════════════════════════════ */}
        <SectionHeader>Notifications</SectionHeader>

        <Card>
          <div className="space-y-1">
            {/* Toggle row */}
            {[
              {
                key: 'report_email' as const,
                label: 'Email me every walk report',
                checked: notifReportEmail,
                onChange: (v: boolean) => {
                  setNotifReportEmail(v)
                  handleSaveNotif('report_email', v)
                },
              },
              {
                key: 'weekly_summary' as const,
                label: 'Weekly walk summary email',
                checked: notifWeeklySummary,
                onChange: (v: boolean) => {
                  setNotifWeeklySummary(v)
                  handleSaveNotif('weekly_summary', v)
                },
              },
            ].map((item, i) => (
              <div key={item.key}>
                {i > 0 && (
                  <hr style={{ border: 'none', borderTop: '1px solid rgba(226,220,200,0.5)', margin: '12px 0' }} />
                )}
                <div className="flex items-center justify-between gap-4 py-1">
                  <p
                    className="text-sm text-slate-700 flex-1"
                    style={{ fontFamily: 'var(--font-nunito)', fontSize: 14 }}
                  >
                    {item.label}
                  </p>
                  <Toggle
                    checked={item.checked}
                    onChange={item.onChange}
                    disabled={savingNotif}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <SectionDivider />

        {/* ════════════════════════════════════════════════════════════════
            SECTION 6: APP & SUPPORT
        ════════════════════════════════════════════════════════════════ */}
        <SectionHeader>App &amp; Support</SectionHeader>

        <Card className="p-0 overflow-hidden">
          {[
            { label: 'FAQ', href: '/faq', icon: '❓' },
            { label: 'Walker guide', sub: 'Share with your walker', href: '/walker-guide', icon: '📋' },
            { label: 'Privacy Policy', href: '/privacy-policy', icon: '🔒' },
            { label: 'Terms of Service', href: '/terms', icon: '📄' },
            { label: 'Refund Policy', href: '/refund-policy', icon: '💸' },
          ].map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100"
              style={{
                borderTop: i > 0 ? '1px solid rgba(226,220,200,0.5)' : 'none',
                minHeight: 52,
              }}
            >
              <span className="text-base w-6 text-center flex-shrink-0">{link.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {link.label}
                </p>
                {link.sub && (
                  <p className="text-[11px] text-slate-400">{link.sub}</p>
                )}
              </div>
              <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}

          {/* WhatsApp support */}
          <a
            href="https://wa.me/919999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100"
            style={{ borderTop: '1px solid rgba(226,220,200,0.5)', minHeight: 52 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366" className="flex-shrink-0" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: 'var(--font-nunito)' }}>
                WhatsApp PupStep support
              </p>
            </div>
            <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
            style={{ borderTop: '1px solid rgba(226,220,200,0.5)', minHeight: 52 }}
          >
            <span className="text-base w-6 text-center flex-shrink-0">→</span>
            <p
              className="text-sm font-bold flex-1 text-left"
              style={{ color: TEAL, fontFamily: 'var(--font-nunito)' }}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </p>
          </button>

          {/* Delete account */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-red-50 active:bg-red-100"
            style={{ borderTop: '1px solid rgba(226,220,200,0.5)', minHeight: 52 }}
          >
            <span className="text-base w-6 text-center flex-shrink-0">🗑</span>
            <p
              className="text-sm font-bold flex-1 text-left"
              style={{ color: '#BE123C', fontFamily: 'var(--font-nunito)' }}
            >
              Delete account
            </p>
          </button>
        </Card>

      </div>

      {/* ── Dog edit bottom sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {editingDog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(10,47,53,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget && !savingDog) setEditingDog(null) }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
              style={{
                background: '#FFFBEB',
                maxHeight: '90dvh',
                boxShadow: '0 -8px 40px rgba(10,47,53,0.18)',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              <div className="px-5 pb-8 pt-2">
                <div className="flex items-center justify-between mb-5">
                  <h2
                    className="text-xl font-bold text-slate-900"
                    style={{ fontFamily: 'var(--font-fredoka)' }}
                  >
                    Edit {editingDog.name}
                  </h2>
                  <button
                    onClick={() => setEditingDog(null)}
                    className="text-slate-400 text-lg"
                    style={{ minHeight: 44, minWidth: 44 }}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Name
                    </label>
                    <input
                      type="text"
                      value={dogName}
                      onChange={e => setDogName(e.target.value)}
                      className="w-full border-2 rounded-xl px-3 outline-none bg-white text-sm"
                      style={{ borderColor: '#E2DCC8', fontFamily: 'var(--font-nunito)', minHeight: 44 }}
                      maxLength={60}
                    />
                  </div>

                  {/* Breed */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Breed (optional)
                    </label>
                    <input
                      type="text"
                      value={dogBreed}
                      onChange={e => setDogBreed(e.target.value)}
                      className="w-full border-2 rounded-xl px-3 outline-none bg-white text-sm"
                      style={{ borderColor: '#E2DCC8', fontFamily: 'var(--font-nunito)', minHeight: 44 }}
                      maxLength={80}
                    />
                  </div>

                  {/* Care focus */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Care focus
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CARE_FOCUS_OPTIONS.map(opt => {
                        const selected = dogCareFocus === opt.key
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setDogCareFocus(opt.key)}
                            className="flex items-center gap-2 px-3 rounded-xl text-sm font-semibold text-left transition-all"
                            style={{
                              minHeight: 44,
                              background: selected
                                ? 'oklch(0.48 0.17 196 / 0.12)'
                                : '#F8FAFC',
                              color: selected ? TEAL : '#374151',
                              border: selected
                                ? `2px solid ${TEAL}`
                                : '2px solid transparent',
                              fontFamily: 'var(--font-nunito)',
                            }}
                          >
                            <span>{opt.emoji}</span>
                            <span>{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Health notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Health notes (optional)
                    </label>
                    <textarea
                      value={dogHealthNotes}
                      onChange={e => setDogHealthNotes(e.target.value)}
                      rows={3}
                      className="w-full border-2 rounded-xl px-3 py-2 outline-none bg-white text-sm resize-none"
                      style={{ borderColor: '#E2DCC8', fontFamily: 'var(--font-nunito)' }}
                      placeholder="Allergies, medications, vet notes…"
                    />
                  </div>

                  {/* Walking instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Walking instructions (optional)
                    </label>
                    <textarea
                      value={dogWalkingInstructions}
                      onChange={e => setDogWalkingInstructions(e.target.value)}
                      rows={3}
                      className="w-full border-2 rounded-xl px-3 py-2 outline-none bg-white text-sm resize-none"
                      style={{ borderColor: '#E2DCC8', fontFamily: 'var(--font-nunito)' }}
                      placeholder="Routes, leash style, commands, anything your walker should know…"
                    />
                  </div>

                  <button
                    onClick={handleSaveDog}
                    disabled={savingDog || !dogName.trim()}
                    className="w-full flex items-center justify-center font-bold text-sm rounded-2xl disabled:opacity-50"
                    style={{
                      background: `linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)`,
                      color: '#fff',
                      boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.18), 0 8px 20px oklch(0.48 0.17 196 / 0.30)`,
                      minHeight: 52,
                      fontFamily: 'var(--font-fredoka)',
                    }}
                  >
                    {savingDog ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h2
                className="text-lg font-bold text-slate-900 mb-1"
                style={{ fontFamily: 'var(--font-fredoka)' }}
              >
                Delete your account?
              </h2>
              <p
                className="text-sm text-slate-500 mb-5 leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Are you sure? This will delete your account and all dog profiles. This cannot be undone.
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
                  className="flex-1 rounded-2xl font-bold text-sm disabled:opacity-50"
                  style={{ background: '#F1F5F9', color: '#475569', fontFamily: 'var(--font-fredoka)', minHeight: 52 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-2xl font-bold text-sm disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(160deg, #F43F5E 0%, #BE123C 100%)',
                    color: '#fff',
                    fontFamily: 'var(--font-fredoka)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.2), inset 0 -3px 0 rgba(0,0,0,0.15)',
                    minHeight: 52,
                  }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ParentBottomNav />
    </div>
  )
}
