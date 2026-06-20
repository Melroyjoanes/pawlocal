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
  'GPS-tagged walk logs',
  'Photo & health diary',
  'Grooming records',
  'Vet visit history',
  'Feeding & medication tracker',
]

const FAQ = [
  {
    q: 'What happens after my free trial?',
    a: 'Your trial converts to the plan you choose. Nothing changes for your walker — they keep logging as usual.',
  },
  {
    q: 'Will the walker see anything change?',
    a: 'No. Walkers and groomers use PupStep for free, always. Pro is only for dog parents like you.',
  },
  {
    q: 'Can I cancel?',
    a: 'Monthly plans can be cancelled anytime before the next billing date. Annual plans are non-refundable after 7 days.',
  },
]

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

export default function UpgradeClient({ currentPlan, expiresAt }: Props) {
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        modal: {
          ondismiss: () => setLoading(null),
        },
      })
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(null)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FFFBEB' }}>
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>
            You&apos;re all set!
          </h1>
          <p className="mb-8" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35' }}>
            Welcome to PupStep Pro. Your dog&apos;s care history is now always at your fingertips.
          </p>
          <Link
            href="/my-account"
            className="inline-block px-8 py-3 rounded-full font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: '#FF8C52', fontFamily: 'var(--font-nunito)' }}
          >
            Go to My Account
          </Link>
        </div>
      </div>
    )
  }

  if (currentPlan) {
    const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FFFBEB' }}>
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🐾</div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>
            You&apos;re on the {currentPlan === 'annual' ? 'Annual' : 'Monthly'} plan
          </h1>
          {expiry && (
            <p className="mb-6 text-sm" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35', opacity: 0.7 }}>
              Active until {expiry}
            </p>
          )}
          <Link
            href="/my-account"
            className="inline-block px-8 py-3 rounded-full font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: '#FF8C52', fontFamily: 'var(--font-nunito)' }}
          >
            Back to My Account
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#FFFBEB' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl md:text-5xl font-bold mb-3"
            style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}
          >
            Upgrade to PupStep Pro 🐾
          </h1>
          <p className="text-lg" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35', opacity: 0.75 }}>
            Know your dog is safe, every single day.
          </p>
        </div>

        {/* Trust line */}
        <div className="text-center mb-10">
          <p className="mb-4 font-semibold" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35' }}>
            Your dog&apos;s care history, always in your hands.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['GPS every walk', 'Photos & health diary', 'Grooming records'].map((chip) => (
              <span
                key={chip}
                className="px-4 py-1.5 rounded-full text-sm font-medium"
                style={{ background: '#FF8C5220', color: '#F07030', fontFamily: 'var(--font-nunito)' }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium text-red-700 bg-red-50 border border-red-200" style={{ fontFamily: 'var(--font-nunito)' }}>
            {error}
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">

          {/* Monthly */}
          <div className="rounded-2xl border-2 p-6 flex flex-col" style={{ borderColor: '#FF8C52', background: '#fff' }}>
            <div className="mb-4">
              <p className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-nunito)', color: '#FF8C52' }}>MONTHLY</p>
              <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>₹249</p>
              <p className="text-sm mt-0.5" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35', opacity: 0.6 }}>per month · Cancel anytime</p>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35' }}>
                  <span style={{ color: '#FF8C52' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loading !== null}
              className="w-full py-3 rounded-full font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#FF8C52', fontFamily: 'var(--font-nunito)' }}
            >
              {loading === 'monthly' ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing…
                </>
              ) : 'Get Monthly'}
            </button>
          </div>

          {/* Annual (recommended) */}
          <div className="rounded-2xl p-6 flex flex-col relative" style={{ background: '#0A2F35' }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#FF8C52', fontFamily: 'var(--font-nunito)' }}>
                RECOMMENDED
              </span>
            </div>
            <div className="mb-4 mt-2">
              <p className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-nunito)', color: '#FF8C52' }}>ANNUAL</p>
              <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-fredoka)', color: '#FFFBEB' }}>₹1,999</p>
              <p className="text-sm mt-0.5" style={{ fontFamily: 'var(--font-nunito)', color: '#FFFBEB', opacity: 0.7 }}>₹166/month — save ₹990</p>
              <span className="inline-block mt-1.5 text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#FF8C5230', color: '#FF8C52', fontFamily: 'var(--font-nunito)' }}>
                2 months free!
              </span>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ fontFamily: 'var(--font-nunito)', color: '#FFFBEB' }}>
                  <span style={{ color: '#FF8C52' }}>✓</span> {f}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm font-semibold" style={{ fontFamily: 'var(--font-nunito)', color: '#FF8C52' }}>
                <span>✓</span> Vet-ready health PDF
              </li>
            </ul>
            <button
              onClick={() => handleCheckout('annual')}
              disabled={loading !== null}
              className="w-full py-3 rounded-full font-bold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#FF8C52', color: '#fff', fontFamily: 'var(--font-nunito)' }}
            >
              {loading === 'annual' ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing…
                </>
              ) : 'Get Annual — Best Value'}
            </button>
          </div>
        </div>

        {/* Value comparison */}
        <div
          className="rounded-2xl px-6 py-4 text-center mb-10"
          style={{ background: '#FF8C5215', border: '1px solid #FF8C5230' }}
        >
          <p className="text-sm" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35' }}>
            Worth <strong>₹2,200/month</strong> if bought separately.{' '}
            <span style={{ color: '#F07030' }}>PupStep Pro: ₹249.</span>
          </p>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>
            Quick answers
          </h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
                <p className="font-semibold text-sm mb-1" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35' }}>{q}</p>
                <p className="text-sm" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35', opacity: 0.7 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35', opacity: 0.5 }}>
          Providers are never charged. PupStep Pro is only for dog parents.
        </p>
      </div>
    </div>
  )
}
