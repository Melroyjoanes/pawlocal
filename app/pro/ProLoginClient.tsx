'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProLoginClient() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState<'not_registered' | 'generic' | null>(null)

  // Read ?status from URL (server sets this after OAuth)
  const urlStatus = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('status')
    : null
  const isPending   = urlStatus === 'pending'
  const isNoAccount = urlStatus === 'no_account'

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // The callback will detect the provider and redirect to /pro/dashboard
        redirectTo: `${window.location.origin}/auth/callback?next=/pro/dashboard`,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    })
    // Page redirects — no need to reset loading
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/pro/auth/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error === 'not_registered' ? 'not_registered' : 'generic')
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
            <div className="flex flex-col gap-4">

              {/* Google sign-in */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 border border-stone-200 bg-white hover:bg-stone-50 active:bg-stone-100 rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-800 transition-all disabled:opacity-60 shadow-sm"
              >
                {googleLoading ? (
                  <svg className="animate-spin h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {googleLoading ? 'Signing in…' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400 font-medium">or use email link</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {/* Magic link form */}
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
            </div>
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
