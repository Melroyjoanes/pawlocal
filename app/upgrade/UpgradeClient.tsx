'use client'

import { useState } from 'react'
import Link from 'next/link'

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void }
  }
}

interface Props {
  currentPlan: 'monthly' | 'annual' | null
  expiresAt: string | null
}

const FEATURES = [
  { icon: '📍', label: 'GPS-tagged walk logs' },
  { icon: '📸', label: 'Photo & health diary' },
  { icon: '✂️', label: 'Grooming records' },
  { icon: '🩺', label: 'Vet visit history' },
  { icon: '🍖', label: 'Feeding & medication tracker' },
  { icon: '📋', label: 'Vet-ready health PDF', annual: true },
]

const FAQ = [
  {
    q: 'What happens after my free trial?',
    a: 'Your trial converts to the plan you chose. Nothing changes for your walker — they keep logging as usual.',
  },
  {
    q: 'Will my walker see any difference?',
    a: 'No. Walkers and groomers use PupStep for free, always. Pro is only for dog parents like you.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Monthly plans cancel anytime before the next billing date. Annual plans get a full refund within 7 days, pro-rated after that.',
  },
]

// 4-layer claymorphism shadow — cream cards
const CLAY_SHADOW_CREAM = [
  'inset 0 2px 0 rgba(255,255,255,0.95)',
  'inset 0 -3px 0 rgba(0,0,0,0.10)',
  '0 1px 0 rgba(0,0,0,0.06)',
  '0 8px 24px -4px rgba(10,47,53,0.14)',
  '0 32px 64px -12px rgba(10,47,53,0.10)',
].join(', ')

// 4-layer claymorphism shadow — teal cards
const CLAY_SHADOW_TEAL = [
  'inset 0 2px 0 rgba(255,255,255,0.18)',
  'inset 0 -4px 0 rgba(0,0,0,0.28)',
  '0 1px 0 rgba(0,0,0,0.12)',
  '0 12px 32px -4px rgba(10,47,53,0.40)',
  '0 40px 80px -16px rgba(10,47,53,0.30)',
].join(', ')

// Orange CTA shadow
const CLAY_SHADOW_ORANGE = [
  'inset 0 2px 0 rgba(255,200,120,0.60)',
  'inset 0 -3px 0 rgba(180,60,0,0.25)',
  '0 4px 14px rgba(255,140,82,0.45)',
  '0 12px 28px rgba(255,140,82,0.20)',
].join(', ')

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

export default function UpgradeClient({ currentPlan, expiresAt }: Props) {
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function handleCheckout(plan: 'monthly' | 'annual') {
    setLoading(plan)
    setError(null)
    try {
      await loadRazorpay()

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json() as {
        order_id?: string
        amount?: number
        key_id?: string
        plan?: string
        error?: string
      }
      if (!res.ok || !data.order_id) throw new Error(data.error ?? 'Failed to create order')

      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: 'INR',
        order_id: data.order_id,
        name: 'PupStep Pro',
        description: plan === 'annual' ? '₹1,999/year' : '₹249/month',
        theme: { color: '#FF8C52' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
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
            const verifyData = await verifyRes.json() as { ok?: boolean; error?: string }
            if (!verifyRes.ok || !verifyData.ok) throw new Error(verifyData.error ?? 'Verification failed')
            setSuccess(true)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment verification failed')
          } finally {
            setLoading(null)
          }
        },
        modal: { ondismiss: () => setLoading(null) },
      })
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(null)
    }
  }

  // — Success state —
  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: '#FFFBEB' }}>
        <div
          className="text-center max-w-sm w-full px-8 py-10 rounded-[28px]"
          style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}
        >
          <div className="text-6xl mb-5">🎉</div>
          <h1
            className="text-3xl font-bold mb-3"
            style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}
          >
            You&apos;re all set!
          </h1>
          <p className="mb-8 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35', opacity: 0.72 }}>
            Welcome to PupStep Pro. Your dog&apos;s care history is now always at your fingertips.
          </p>
          <Link
            href="/my-account"
            className="inline-block px-8 py-3.5 rounded-full font-bold text-white text-sm"
            style={{ background: '#FF8C52', boxShadow: CLAY_SHADOW_ORANGE, fontFamily: 'var(--font-nunito)' }}
          >
            Go to My Account
          </Link>
        </div>
      </div>
    )
  }

  // — Already subscribed state —
  if (currentPlan) {
    const expiry = expiresAt
      ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null
    return (
      <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: '#FFFBEB' }}>
        <div
          className="text-center max-w-sm w-full px-8 py-10 rounded-[28px]"
          style={{ background: '#0A2F35', boxShadow: CLAY_SHADOW_TEAL }}
        >
          <div className="text-5xl mb-5">🐾</div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-fredoka)', color: '#FFFBEB' }}
          >
            You&apos;re on the {currentPlan === 'annual' ? 'Annual' : 'Monthly'} plan
          </h1>
          {expiry && (
            <p className="mb-6 text-sm" style={{ fontFamily: 'var(--font-nunito)', color: '#FFFBEB', opacity: 0.65 }}>
              Active until {expiry}
            </p>
          )}
          <Link
            href="/my-account"
            className="inline-block px-8 py-3.5 rounded-full font-bold text-white text-sm"
            style={{ background: '#FF8C52', boxShadow: CLAY_SHADOW_ORANGE, fontFamily: 'var(--font-nunito)' }}
          >
            Back to My Account
          </Link>
        </div>
      </div>
    )
  }

  // — Main pricing view —
  return (
    <div
      className="min-h-dvh py-16 px-4"
      style={{ background: 'linear-gradient(180deg, #FFFBEB 0%, #FFF3C4 100%)' }}
    >
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
            style={{ background: 'rgba(255,140,82,0.15)', color: '#E07030', fontFamily: 'var(--font-nunito)' }}
          >
            PupStep Pro
          </span>
          <h1
            className="text-4xl md:text-5xl font-bold leading-tight mb-4"
            style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}
          >
            Your dog deserves a<br />care diary 🐾
          </h1>
          <p
            className="text-base max-w-xs mx-auto leading-relaxed"
            style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35', opacity: 0.65 }}
          >
            Every walk. Every vet visit. Every meal. Always in your hands.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-2xl text-sm font-medium"
            style={{ background: '#FEE2E2', color: '#991B1B', fontFamily: 'var(--font-nunito)', boxShadow: '0 2px 8px rgba(153,27,27,0.12)' }}
          >
            {error}
          </div>
        )}

        {/* Pricing cards */}
        <div className="space-y-4 mb-10">

          {/* Annual — hero card */}
          <div
            className="relative rounded-[28px] p-7"
            style={{ background: '#0A2F35', boxShadow: CLAY_SHADOW_TEAL }}
          >
            {/* Best value badge */}
            <div className="absolute -top-3.5 right-6">
              <span
                className="inline-block px-4 py-1.5 rounded-full text-xs font-bold text-white"
                style={{
                  background: '#FF8C52',
                  boxShadow: CLAY_SHADOW_ORANGE,
                  fontFamily: 'var(--font-nunito)',
                }}
              >
                Best value — save ₹990
              </span>
            </div>

            <div className="flex items-start justify-between mb-5 mt-1">
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: 'rgba(255,251,235,0.45)', fontFamily: 'var(--font-nunito)' }}
                >
                  Annual plan
                </p>
                <div className="flex items-end gap-2">
                  <span
                    className="text-5xl font-bold leading-none"
                    style={{ fontFamily: 'var(--font-fredoka)', color: '#FFFBEB' }}
                  >
                    ₹1,999
                  </span>
                  <span className="text-sm pb-1" style={{ color: 'rgba(255,251,235,0.5)', fontFamily: 'var(--font-nunito)' }}>/year</span>
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(255,140,82,0.9)', fontFamily: 'var(--font-nunito)' }}>
                  ₹166/month — 2 months free
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(255,251,235,0.08)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.20)' }}
              >
                🏆
              </div>
            </div>

            <ul className="space-y-2.5 mb-6">
              {FEATURES.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-2.5 text-sm"
                  style={{ color: '#FFFBEB', fontFamily: 'var(--font-nunito)', opacity: 0.9 }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                    style={{ background: 'rgba(255,140,82,0.20)' }}
                  >
                    ✓
                  </span>
                  {f.label}
                  {f.annual && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
                      style={{ background: 'rgba(255,140,82,0.25)', color: '#FF8C52' }}
                    >
                      Annual only
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('annual')}
              disabled={loading !== null}
              className="w-full py-4 rounded-[18px] font-bold text-white text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{
                background: '#FF8C52',
                boxShadow: CLAY_SHADOW_ORANGE,
                fontFamily: 'var(--font-nunito)',
              }}
            >
              {loading === 'annual' ? <><Spinner /> Processing…</> : 'Get Annual Plan'}
            </button>
          </div>

          {/* Monthly — secondary card */}
          <div
            className="rounded-[28px] p-7"
            style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: 'rgba(10,47,53,0.40)', fontFamily: 'var(--font-nunito)' }}
                >
                  Monthly plan
                </p>
                <div className="flex items-end gap-2">
                  <span
                    className="text-4xl font-bold leading-none"
                    style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}
                  >
                    ₹249
                  </span>
                  <span className="text-sm pb-0.5" style={{ color: 'rgba(10,47,53,0.40)', fontFamily: 'var(--font-nunito)' }}>/month</span>
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(10,47,53,0.45)', fontFamily: 'var(--font-nunito)' }}>
                  Cancel anytime, no questions
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'rgba(255,140,82,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.08)' }}
              >
                📅
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              {FEATURES.filter(f => !f.annual).map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-2.5 text-sm"
                  style={{ color: '#0A2F35', fontFamily: 'var(--font-nunito)', opacity: 0.8 }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
                    style={{ background: 'rgba(255,140,82,0.15)', color: '#FF8C52' }}
                  >
                    ✓
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loading !== null}
              className="w-full py-3.5 rounded-[18px] font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{
                background: 'rgba(255,140,82,0.12)',
                color: '#E07030',
                fontFamily: 'var(--font-nunito)',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(200,80,0,0.12), 0 4px 12px rgba(255,140,82,0.18)',
              }}
            >
              {loading === 'monthly' ? <><Spinner /> Processing…</> : 'Start Monthly'}
            </button>
          </div>
        </div>

        {/* Social proof */}
        <p
          className="text-center text-xs mb-10"
          style={{ color: 'rgba(10,47,53,0.45)', fontFamily: 'var(--font-nunito)' }}
        >
          Dog parents in Juhu, Versova &amp; Andheri use PupStep Pro every day
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {['GPS every walk', 'Photos saved forever', 'Vet-ready PDF', 'Grooming history', 'Share with vets'].map((pill) => (
            <span
              key={pill}
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{
                background: '#fff',
                color: '#0A2F35',
                fontFamily: 'var(--font-nunito)',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,1), inset 0 -2px 0 rgba(0,0,0,0.08), 0 4px 12px rgba(10,47,53,0.10)',
              }}
            >
              {pill}
            </span>
          ))}
        </div>

        {/* FAQ accordion */}
        <div className="space-y-2 mb-10">
          <h2
            className="text-lg font-bold mb-4"
            style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}
          >
            Common questions
          </h2>
          {FAQ.map(({ q, a }, i) => (
            <div
              key={q}
              className="rounded-[18px] overflow-hidden"
              style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span
                  className="text-sm font-semibold pr-4"
                  style={{ color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}
                >
                  {q}
                </span>
                <span
                  className="text-lg flex-shrink-0 transition-transform duration-200"
                  style={{ transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)', color: '#FF8C52' }}
                >
                  +
                </span>
              </button>
              {openFaq === i && (
                <div
                  className="px-5 pb-4 text-sm leading-relaxed"
                  style={{ color: '#0A2F35', opacity: 0.7, fontFamily: 'var(--font-nunito)' }}
                >
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center space-y-1">
          <p className="text-xs" style={{ color: 'rgba(10,47,53,0.40)', fontFamily: 'var(--font-nunito)' }}>
            Providers are never charged. Pro is only for dog parents.
          </p>
          <p className="text-xs" style={{ color: 'rgba(10,47,53,0.35)', fontFamily: 'var(--font-nunito)' }}>
            <Link href="/refund-policy" className="underline underline-offset-2">Refund policy</Link>
            {' · '}
            <Link href="/privacy-policy" className="underline underline-offset-2">Privacy</Link>
            {' · '}
            <Link href="/terms" className="underline underline-offset-2">Terms</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
