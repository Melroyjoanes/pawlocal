'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProLoginClient() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState<'not_registered' | 'generic' | null>(null)

  // Read ?status from URL (server sets this after OAuth)
  const urlStatus = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('status')
    : null
  const isPending   = urlStatus === 'pending'
  const isNoAccount = urlStatus === 'no_account'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Step 1: verify email is an approved provider (server-side, service role)
      const check = await fetch('/api/pro/auth/check-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!check.ok) {
        const data = await check.json().catch(() => ({}))
        if (data.error === 'pending') {
          // Redirect to pending state so they see the right message
          window.location.href = '/pro?status=pending'
          return
        }
        setError('not_registered')
        setLoading(false)
        return
      }

      // Step 2: let Supabase send the magic link email natively — no Resend needed,
      // no silent failures. Supabase delivers this reliably via their own SMTP.
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Must be in Supabase → Auth → URL Configuration → Redirect URLs whitelist
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/pro/dashboard`,
          shouldCreateUser: true,
        },
      })

      if (otpError) {
        setError('generic')
      } else {
        setSent(true)
      }
    } catch {
      setError('generic')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-8">

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🐾</div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-nunito), sans-serif' }}>
              Provider Login
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Sign in to access your provider dashboard.
            </p>
          </div>

          {/* No provider account — customer accidentally landed here */}
          {isNoAccount && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4 text-sm text-blue-800 text-center">
              <div className="text-2xl mb-2">👋</div>
              <p className="font-semibold mb-1">No provider account found</p>
              <p className="text-blue-700 text-xs mb-3">
                This Google account isn&apos;t registered as a provider. Are you a pet owner looking for services?
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="/my-account"
                  className="block w-full py-2.5 rounded-xl bg-white border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 transition-colors"
                >
                  ← Back to customer sign-in
                </a>
                <a
                  href="/join"
                  className="block w-full py-2.5 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'oklch(0.48 0.17 196)' }}
                >
                  Apply as a provider →
                </a>
              </div>
            </div>
          )}

          {/* Pending state */}
          {isPending && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 text-sm text-amber-800 text-center">
              <div className="text-2xl mb-2">⏳</div>
              <p className="font-semibold mb-1">Application under review</p>
              <p className="text-amber-700 text-xs">We received your application. You&apos;ll get an email once approved — usually within 24 hours.</p>
            </div>
          )}

          {sent ? (
            /* Magic link sent */
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'oklch(0.95 0.05 196)' }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  style={{ color: 'oklch(0.48 0.17 196)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Check your inbox!</h2>
              <p className="text-sm text-slate-500">
                We sent a sign-in link to <strong className="text-slate-700">{email}</strong>.
                The link expires in 1 hour.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-5 text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white"
                    style={{ '--tw-ring-color': 'oklch(0.48 0.17 196)' } as React.CSSProperties}
                    onFocus={e => e.currentTarget.style.borderColor = 'oklch(0.48 0.17 196)'}
                    onBlur={e => e.currentTarget.style.borderColor = ''}
                  />
                </div>

                {error === 'not_registered' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    This email isn&apos;t registered as a provider.{' '}
                    <a href="/join" className="font-semibold underline">Apply to join →</a>
                  </div>
                )}
                {error === 'generic' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                    Something went wrong. Please try again.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.includes('@')}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'oklch(0.48 0.17 196)' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : 'Send me a link'}
                </button>
              </form>
          )}
        </div>

        <p className="text-xs text-center text-slate-400 mt-4">
          Not a provider yet?{' '}
          <a href="/join" className="underline hover:text-slate-600">Apply to join →</a>
        </p>
      </div>
    </div>
  )
}
