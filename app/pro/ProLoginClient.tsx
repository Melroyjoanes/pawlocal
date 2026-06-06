'use client'

import { useState } from 'react'

export default function ProLoginClient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<'not_registered' | 'generic' | null>(null)

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
        if (data.error === 'not_registered') {
          setError('not_registered')
        } else {
          setError('generic')
        }
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
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🐾</div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Provider Login
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Enter your registered email to receive a sign-in link.
            </p>
          </div>

          {sent ? (
            /* Success state */
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
            /* Login form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

              {/* Error messages */}
              {error === 'not_registered' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  This email isn&apos;t registered as a provider.{' '}
                  <a
                    href="https://wa.me/919082980099"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline"
                  >
                    Message us on WhatsApp to get access.
                  </a>
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
                ) : (
                  'Send me a link'
                )}
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
