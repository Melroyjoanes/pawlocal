'use client'

import { useState } from 'react'
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
  const [subscribed, setSubscribed] = useState(isSubscribed)
  const [filter, setFilter] = useState<'all' | 'walk' | 'groom'>('all')

  // Merge all reports into one timeline
  type ReportItem =
    | { kind: 'walk'; date: string; data: WalkReport }
    | { kind: 'groom'; date: string; data: GroomingReport }

  const timeline: ReportItem[] = [
    ...walkReports.map(r => ({ kind: 'walk' as const, date: r.walk_date, data: r })),
    ...groomingReports.map(r => ({ kind: 'groom' as const, date: r.grooming_date, data: r })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filteredTimeline = filter === 'all'
    ? timeline
    : timeline.filter(item => item.kind === filter)

  const lockedCount = subscribed ? 0 : timeline.filter(r => isLocked(r.date)).length
  const firstName = userName.split(' ')[0]

  const FILTER_TABS: { id: 'all' | 'walk' | 'groom'; label: string }[] = [
    { id: 'all',   label: 'All' },
    { id: 'walk',  label: 'Walks' },
    { id: 'groom', label: 'Grooming' },
  ]

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
              ? 'No reports yet — ask your walker or groomer to add you in PupStep.'
              : `${timeline.length} report${timeline.length === 1 ? '' : 's'} from your care team`}
          </p>
        </motion.div>

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE, delay: 0.05 }}
          className="flex gap-2 mb-5"
        >
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="px-4 py-2 rounded-full text-sm font-bold transition-all"
              style={filter === tab.id ? {
                background: 'oklch(0.48 0.17 196)',
                color: 'white',
                boxShadow: '0 2px 8px oklch(0.48 0.17 196 / 0.35)',
              } : {
                background: 'white',
                color: 'oklch(0.44 0.05 250)',
                border: '1.5px solid rgba(226,220,200,0.8)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

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
        ) : filter === 'groom' && groomingReports.length === 0 ? (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: 'white', border: '1.5px solid rgba(226,220,200,0.7)' }}>
            <div className="text-4xl mb-3">✂️</div>
            <h3 className="font-semibold text-stone-700 mb-1">Grooming reports coming soon</h3>
            <p className="text-sm text-stone-400 leading-relaxed">
              Ask your groomer to send reports after each session.
            </p>
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: 'white', border: '1.5px solid rgba(226,220,200,0.7)' }}>
            <div className="text-4xl mb-3">🐾</div>
            <p className="text-sm text-stone-400">No {filter === 'walk' ? 'walk' : 'grooming'} reports yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filteredTimeline.map((item, i) => {
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
    </div>
  )
}
