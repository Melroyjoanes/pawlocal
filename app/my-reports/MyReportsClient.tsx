'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EASE = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } as const
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

interface WalkReport {
  id: string; token: string; dog_name: string; duration_mins: number
  poop_count: number; pee_count: number; distance_meters: number | null
  walk_date: string; created_at: string; photo_url: string | null
  notes: string | null; providers: { name: string } | null
}

interface GroomingReport {
  id: string; token: string; dog_name: string; grooming_date: string
  services_done: string[]; ticks_found: number; after_photo_url: string | null
  created_at: string; providers: { name: string } | null
}

interface Provider {
  id: string
  provider_name: string
  role: 'walker' | 'groomer' | 'caretaker'
  invite_status: 'pending' | 'accepted' | 'declined'
}

interface Props {
  walkReports: WalkReport[]
  groomingReports: GroomingReport[]
  isSubscribed: boolean
  subscriptionPlan: string | null
  userName: string
}

function isLocked(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() > THREE_DAYS_MS
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ROLES_META = {
  walker: { emoji: '🦮', label: 'Walker' },
  groomer: { emoji: '✂️', label: 'Groomer' },
  caretaker: { emoji: '🏡', label: 'Caretaker' },
}

// ─── Add Provider Sheet ───────────────────────────────────────────────────────
function AddProviderSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [petName, setPetName] = useState('')
  const [role, setRole] = useState<'walker' | 'groomer' | 'caretaker'>('walker')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [successLink, setSuccessLink] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_name: petName, role, whatsapp_number: whatsapp }),
      })
      const data = await res.json()
      if (data?.whatsapp_link) {
        setSuccessLink(data.whatsapp_link)
        onAdded()
      } else {
        alert('Could not create invite. Please try again.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const ROLES = [
    { value: 'walker' as const, label: 'Walker', emoji: '🦮' },
    { value: 'groomer' as const, label: 'Groomer', emoji: '✂️' },
    { value: 'caretaker' as const, label: 'Caretaker', emoji: '🏡' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full rounded-t-3xl p-6 pb-10"
        style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mb-6" />

        {successLink ? (
          /* ── Success state ──────────────────────────────── */
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display text-2xl text-stone-900 mb-2">Invite sent!</h2>
            <p className="text-sm text-stone-500 mb-6 leading-relaxed">
              Now send the invite link to your {role} on WhatsApp.
            </p>
            <a
              href={successLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-white text-base mb-3"
              style={{
                background: 'linear-gradient(160deg, #25D366 0%, #1aad54 100%)',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -4px 0 rgba(14,100,55,0.50), 0 10px 24px rgba(37,211,102,0.32)',
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.845L.057 23.428a.5.5 0 00.609.61l5.64-1.476A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.91 0-3.698-.5-5.244-1.373l-.375-.217-3.888 1.018 1.034-3.774-.237-.389A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
              Send invite to your {role} →
            </a>
            <button onClick={onClose} className="w-full py-3 text-sm text-stone-400">
              Done
            </button>
          </div>
        ) : (
          /* ── Form state ─────────────────────────────────── */
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">➕</div>
              <h2 className="font-display text-2xl text-stone-900 mb-2">Add your care team</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                We&apos;ll send them a link to set up PupStep and start sharing reports with you.
              </p>
            </div>

            {/* Role selector */}
            <div className="flex gap-2 mb-4">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: role === r.value ? 'oklch(0.48 0.17 196)' : 'oklch(0.97 0.01 85)',
                    color: role === r.value ? 'white' : 'oklch(0.35 0.08 196)',
                    border: role === r.value ? 'none' : '1.5px solid rgba(226,220,200,0.8)',
                  }}
                >
                  {r.emoji} {r.label}
                </button>
              ))}
            </div>

            {/* Dog name */}
            <input
              type="text"
              placeholder="Your dog's name"
              value={petName}
              onChange={e => setPetName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl text-base font-semibold text-stone-900 placeholder:text-stone-300 outline-none mb-3"
              style={{ background: 'oklch(0.97 0.01 85)', border: '1.5px solid rgba(226,220,200,0.8)' }}
            />

            {/* WhatsApp */}
            <div className="relative mb-5">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold"
                style={{ color: 'oklch(0.48 0.17 196)' }}
              >
                +91
              </span>
              <input
                type="tel"
                placeholder="Walker's WhatsApp number"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-base font-semibold text-stone-900 placeholder:text-stone-300 outline-none"
                style={{ background: 'oklch(0.97 0.01 85)', border: '1.5px solid rgba(226,220,200,0.8)' }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!petName.trim() || whatsapp.length !== 10 || loading}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-opacity disabled:opacity-40"
              style={{ background: 'oklch(0.48 0.17 196)', boxShadow: '0 4px 0 oklch(0.35 0.14 196)' }}
            >
              {loading ? 'Sending invite…' : 'Send WhatsApp invite →'}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── My Care Team section ─────────────────────────────────────────────────────
function MyCareTeam({ onAdd }: { onAdd: () => void }) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/my-providers')
      .then(r => r.ok ? r.json() : [])
      .then((data: Provider[]) => setProviders(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={EASE}
      className="mb-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">My Care Team</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
          style={{
            border: '1.5px solid oklch(0.48 0.17 196)',
            color: 'oklch(0.48 0.17 196)',
            background: 'transparent',
          }}
        >
          + Add
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'white', border: '1.5px solid rgba(226,220,200,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        {loading ? (
          <div className="px-4 py-5 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-stone-200 border-t-stone-400 animate-spin" />
            <span className="text-sm text-stone-400">Loading your team…</span>
          </div>
        ) : providers.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-sm text-stone-400 mb-3 leading-relaxed">
              No care team yet. Add your walker or groomer to start getting reports.
            </p>
            <button
              onClick={onAdd}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'oklch(0.48 0.17 196)' }}
            >
              Add your walker/groomer
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(226,220,200,0.5)' }}>
            {providers.map(p => {
              const meta = ROLES_META[p.role] ?? { emoji: '🐾', label: p.role }
              const isAccepted = p.invite_status === 'accepted'
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: 'oklch(0.94 0.06 196)' }}
                  >
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">{p.provider_name}</p>
                    <p className="text-xs text-stone-400">{meta.label}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: isAccepted ? '#22c55e' : '#f59e0b' }}
                    />
                    <span className="text-xs font-medium" style={{ color: isAccepted ? '#16a34a' : '#d97706' }}>
                      {isAccepted ? 'Linked' : 'Pending'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Upgrade Sheet ────────────────────────────────────────────────────────────
function UpgradeSheet({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly')

  async function handlePay() {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const { order_id, amount, key_id } = await res.json()

      const rzp = new (window as any).Razorpay({
        key: key_id,
        amount,
        currency: 'INR',
        order_id,
        name: 'PupStep',
        description: plan === 'monthly' ? '₹149/month — Unlimited report history' : '₹999/year — Unlimited report history',
        image: '/icon-192.png',
        handler: async (response: any) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
            }),
          })
          if (verifyRes.ok) { onSuccess(); onClose() }
        },
        prefill: {},
        theme: { color: 'oklch(0.48 0.17 196)' },
      })
      rzp.open()
    } catch {
      alert('Payment could not be started. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const PLANS = {
    monthly: { label: '₹149 / month', desc: 'Billed monthly', saving: null },
    annual:  { label: '₹999 / year',  desc: 'Save ₹789 vs monthly', saving: '₹789' },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full rounded-t-3xl p-6 pb-10"
        style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mb-6" />

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔓</div>
          <h2 className="font-display text-2xl text-stone-900 mb-2">Unlock full history</h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            Get unlimited access to every report — walks, grooming, photos, GPS routes. Forever.
          </p>
        </div>

        {/* Plan picker */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['monthly', 'annual'] as const).map(p => (
            <button key={p} onClick={() => setPlan(p)}
              className="rounded-2xl p-4 text-left transition-all border-2"
              style={{
                borderColor: plan === p ? 'oklch(0.48 0.17 196)' : 'rgba(226,220,200,0.8)',
                background: plan === p ? 'oklch(0.96 0.04 196)' : 'white',
              }}>
              <p className="text-base font-bold text-stone-900">{PLANS[p].label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{PLANS[p].desc}</p>
              {PLANS[p].saving && (
                <span className="inline-block mt-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#DCFCE7', color: '#166534' }}>Save {PLANS[p].saving}</span>
              )}
            </button>
          ))}
        </div>

        <button onClick={handlePay} disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-opacity disabled:opacity-60"
          style={{ background: 'oklch(0.48 0.17 196)', boxShadow: '0 4px 0 oklch(0.35 0.14 196)' }}>
          {loading ? 'Opening payment…' : `Pay ${PLANS[plan].label}`}
        </button>

        <p className="text-center text-xs text-stone-400 mt-3">Secure payment via Razorpay · Cancel anytime</p>
      </motion.div>
    </motion.div>
  )
}

// ─── Walk Report Card ─────────────────────────────────────────────────────────
function WalkCard({ report, locked, onUnlock }: { report: WalkReport; locked: boolean; onUnlock: () => void }) {
  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1.5px solid rgba(226,220,200,0.7)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <div className={locked ? 'filter blur-[3px] pointer-events-none select-none' : ''}>
        <div className="flex gap-3 p-4">
          {report.photo_url ? (
            <img src={report.photo_url} alt={report.dog_name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
              style={{ background: 'oklch(0.94 0.06 196)' }}>🐾</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-base text-stone-900 leading-tight">{report.dog_name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'oklch(0.94 0.06 196)', color: 'oklch(0.44 0.16 196)' }}>Walk</span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">{formatDate(report.walk_date)} · {report.providers?.name}</p>
            <div className="flex gap-3 mt-2 text-xs text-stone-500">
              <span>⏱ {report.duration_mins}m</span>
              {report.distance_meters && <span>📏 {(report.distance_meters / 1000).toFixed(1)}km</span>}
              {report.poop_count > 0 && <span>💩 ×{report.poop_count}</span>}
              {report.pee_count > 0 && <span>💧 ×{report.pee_count}</span>}
            </div>
          </div>
        </div>
      </div>
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)' }}>
          <span className="text-2xl">🔒</span>
          <p className="text-xs font-semibold text-stone-600">Older than 3 days</p>
          <button onClick={onUnlock}
            className="text-xs font-bold px-4 py-2 rounded-xl text-white"
            style={{ background: 'oklch(0.48 0.17 196)' }}>
            Unlock for ₹149/mo
          </button>
        </div>
      )}
      {!locked && (
        <a href={`/walk-report/${report.token}`}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border-t"
          style={{ borderColor: 'rgba(226,220,200,0.5)', color: 'oklch(0.44 0.16 196)' }}>
          View full report →
        </a>
      )}
    </div>
  )
}

// ─── Grooming Card ────────────────────────────────────────────────────────────
function GroomCard({ report, locked, onUnlock }: { report: GroomingReport; locked: boolean; onUnlock: () => void }) {
  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1.5px solid rgba(226,220,200,0.7)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <div className={locked ? 'filter blur-[3px] pointer-events-none select-none' : ''}>
        <div className="flex gap-3 p-4">
          {report.after_photo_url ? (
            <img src={report.after_photo_url} alt={report.dog_name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
              style={{ background: '#F3E8FF' }}>✂️</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-base text-stone-900 leading-tight">{report.dog_name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: '#F3E8FF', color: '#7C3AED' }}>Grooming</span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">{formatDate(report.grooming_date)} · {report.providers?.name}</p>
            <p className="text-xs text-stone-400 mt-1">{report.services_done?.slice(0, 3).join(', ')}{report.services_done?.length > 3 ? ' +more' : ''}</p>
          </div>
        </div>
      </div>
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)' }}>
          <span className="text-2xl">🔒</span>
          <p className="text-xs font-semibold text-stone-600">Older than 3 days</p>
          <button onClick={onUnlock}
            className="text-xs font-bold px-4 py-2 rounded-xl text-white"
            style={{ background: 'oklch(0.48 0.17 196)' }}>
            Unlock for ₹149/mo
          </button>
        </div>
      )}
      {!locked && (
        <a href={`/grooming-report/${report.token}`}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border-t"
          style={{ borderColor: 'rgba(226,220,200,0.5)', color: '#7C3AED' }}>
          View full report →
        </a>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MyReportsClient({ walkReports, groomingReports, isSubscribed, subscriptionPlan, userName }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [subscribed, setSubscribed] = useState(isSubscribed)
  const [providerRefreshKey, setProviderRefreshKey] = useState(0)

  // Merge all reports into one timeline
  type ReportItem =
    | { kind: 'walk'; date: string; data: WalkReport }
    | { kind: 'groom'; date: string; data: GroomingReport }

  const timeline: ReportItem[] = [
    ...walkReports.map(r => ({ kind: 'walk' as const, date: r.walk_date, data: r })),
    ...groomingReports.map(r => ({ kind: 'groom' as const, date: r.grooming_date, data: r })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const lockedCount = subscribed ? 0 : timeline.filter(r => isLocked(r.date)).length
  const firstName = userName.split(' ')[0]

  return (
    <div className="min-h-dvh pb-24" style={{ background: 'oklch(0.975 0.006 85)' }}>

      {/* Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <header className="sticky top-0 z-40 bg-white border-b border-stone-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-display text-xl text-stone-900">My Reports</h1>
          {subscribed ? (
            <span className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: '#DCFCE7', color: '#166534' }}>
              ✓ {subscriptionPlan === 'annual' ? 'Annual' : 'Monthly'} plan
            </span>
          ) : (
            <button onClick={() => setShowUpgrade(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
              style={{ background: 'oklch(0.48 0.17 196)' }}>
              Upgrade ₹149/mo
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5">

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={EASE}
          className="mb-5">
          <h2 className="font-display text-2xl text-stone-900">Hi {firstName} 👋</h2>
          <p className="text-sm text-stone-400 mt-1">
            {timeline.length === 0
              ? 'No reports yet — add your walker or groomer below to get started.'
              : `${timeline.length} report${timeline.length === 1 ? '' : 's'} from your care team`}
          </p>
        </motion.div>

        {/* My Care Team section */}
        <MyCareTeam
          key={providerRefreshKey}
          onAdd={() => setShowAddProvider(true)}
        />

        {/* Locked banner */}
        {!subscribed && lockedCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={EASE}
            className="rounded-2xl p-4 mb-5 flex items-center justify-between gap-3"
            style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', border: '1px solid rgba(253,230,138,0.8)' }}>
            <div>
              <p className="text-sm font-bold text-stone-900">{lockedCount} older report{lockedCount > 1 ? 's' : ''} locked</p>
              <p className="text-xs text-stone-600 mt-0.5">Unlock all history for ₹149/month</p>
            </div>
            <button onClick={() => setShowUpgrade(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'oklch(0.48 0.17 196)' }}>
              Unlock
            </button>
          </motion.div>
        )}

        {/* Timeline */}
        {timeline.length === 0 ? (
          <div className="rounded-2xl p-10 text-center"
            style={{ background: 'white', border: '1.5px solid rgba(226,220,200,0.7)' }}>
            <div className="text-5xl mb-4">🐾</div>
            <h3 className="font-bold text-stone-900 mb-2">No reports yet</h3>
            <p className="text-sm text-stone-400 leading-relaxed">
              Your walker or groomer needs to add you as a client in PupStep. Ask them to look for the &ldquo;My Clients&rdquo; section.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {timeline.map((item, i) => {
                const locked = !subscribed && isLocked(item.date)
                return (
                  <motion.div key={`${item.kind}-${item.data.id}`}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ ...EASE, delay: Math.min(i * 0.04, 0.2) }}>
                    {item.kind === 'walk' ? (
                      <WalkCard report={item.data as WalkReport} locked={locked} onUnlock={() => setShowUpgrade(true)} />
                    ) : (
                      <GroomCard report={item.data as GroomingReport} locked={locked} onUnlock={() => setShowUpgrade(true)} />
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Upgrade sheet */}
      <AnimatePresence>
        {showUpgrade && (
          <UpgradeSheet
            onClose={() => setShowUpgrade(false)}
            onSuccess={() => setSubscribed(true)}
          />
        )}
      </AnimatePresence>

      {/* Add provider sheet */}
      <AnimatePresence>
        {showAddProvider && (
          <AddProviderSheet
            onClose={() => setShowAddProvider(false)}
            onAdded={() => setProviderRefreshKey(k => k + 1)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
