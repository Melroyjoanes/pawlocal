'use client'

import { useState } from 'react'
import { trackEvent, getGaClientId } from '@/lib/analytics'

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void }
  }
}

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

type Plan = 'monthly'

// Shared Razorpay checkout flow — used by both the /upgrade pricing page and
// any other "Upgrade"/"Pay now" entry point (e.g. My Account) that should
// open the Razorpay modal directly instead of routing through /upgrade first.
export function useRazorpayCheckout(opts?: { onSuccessRedirect?: string }) {
  const [loading, setLoading] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function checkout(plan: Plan) {
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

      trackEvent('begin_checkout', { currency: 'INR', value: 199, plan })

      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: 'INR',
        order_id: data.order_id,
        name: 'PupStep Pro',
        description: '₹199/month',
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
                ga_client_id: getGaClientId(),
              }),
            })
            const verifyData = await verifyRes.json() as { ok?: boolean; error?: string }
            if (!verifyRes.ok || !verifyData.ok) throw new Error(verifyData.error ?? 'Verification failed')
            trackEvent('purchase', {
              currency: 'INR',
              value: 199,
              transaction_id: response.razorpay_payment_id,
              plan,
            })
            window.location.href = opts?.onSuccessRedirect ?? '/setup?just_paid=1'
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Payment verification failed'
            setError(message)
            try {
              fetch('/api/payments/log-incident', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  kind: 'verify_failed',
                  details: { message },
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                }),
              }).catch(() => {})
            } catch {}
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

  return { checkout, loading, error }
}
