'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  redirectTo?: string
  message?: string
  /** Called after successful sign-in when staying on the same page (e.g. email OTP path) */
  onSignedIn?: (userId: string) => void
}

type EmailView = 'input' | 'otp'

export default function AuthModal({ open, onClose, redirectTo, message, onSignedIn }: AuthModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailView, setEmailView] = useState<EmailView>('input')
  const [emailInput, setEmailInput] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      setError('')
      setEmailView('input')
      setEmailInput('')
      setOtpCode('')
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleGoogle() {
    setLoading(true)
    setError('')
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/')}`,
      },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handleSendOtp() {
    if (!emailInput.trim()) { setError('Please enter your email'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/home')}`,
      },
    })
    if (error) {
      setError('Could not send the code — please try again in a minute.')
      setLoading(false)
      return
    }
    setLoading(false)
    setEmailView('otp')
  }

  async function handleVerifyOtp() {
    if (otpCode.trim().length !== 6) { setError('Enter the 6-digit code'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email: emailInput.trim(),
      token: otpCode.trim(),
      type: 'email',
    })
    if (error) {
      setError('Incorrect code. Please try again.')
      setLoading(false)
      return
    }
    // User is now signed in — same browser context, localStorage draft still intact
    const { data: { user } } = await supabase.auth.getUser()
    setLoading(false)
    onClose()
    if (user && onSignedIn) {
      onSignedIn(user.id)
    }
  }

  async function handleResendOtp() {
    setError('')
    setOtpCode('')
    await supabase.auth.signInWithOtp({
      email: emailInput.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/home')}`,
      },
    })
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-6 pt-4 pb-3">
          {/* Context message */}
          {message && (
            <p className="text-xs text-[var(--pl-teal)] font-semibold text-center mb-4 bg-teal-50 rounded-xl py-2 px-3">
              {message}
            </p>
          )}

          {/* ── OTP email input view ── */}
          {emailView === 'otp' ? (
            <>
              <h2
                className="text-center mb-1"
                style={{ fontFamily: 'var(--font-fredoka, sans-serif)', fontSize: 20, fontWeight: 700, color: '#0A2F35' }}
              >
                Enter the 6-digit code
              </h2>
              <p className="text-center mb-6" style={{ fontSize: 13, color: '#6B7280' }}>
                We sent a code to <strong>{emailInput}</strong>
              </p>

              <input
                type="number"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setOtpCode(val)
                  setError('')
                }}
                onKeyDown={e => { if (e.key === 'Enter' && otpCode.length === 6) handleVerifyOtp() }}
                autoFocus
                className="w-full text-center rounded-2xl outline-none mb-4"
                style={{
                  padding: '14px 16px',
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  border: '2px solid #E5E7EB',
                  color: '#0A2F35',
                  fontFamily: 'var(--font-fredoka, monospace)',
                  MozAppearance: 'textfield',
                }}
              />

              {error && <p className="text-sm text-red-500 text-center mb-3">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-2xl font-bold text-white disabled:opacity-50"
                style={{
                  minHeight: 56,
                  background: 'oklch(0.48 0.17 196)',
                  fontSize: 16,
                  fontFamily: 'var(--font-fredoka, sans-serif)',
                }}
              >
                {loading ? (
                  <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : null}
                {loading ? 'Verifying…' : 'Verify code →'}
              </button>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => { setEmailView('input'); setOtpCode(''); setError('') }}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ← Use different email
                </button>
                <button
                  onClick={handleResendOtp}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Resend code
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900 text-center mb-1">Welcome to PupStep</h2>
              <p className="text-sm text-slate-500 text-center mb-6">Sign in to contact providers and save favourites</p>

              {/* Google sign-in */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 rounded-2xl py-4 font-semibold text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 mb-4"
              >
                {loading ? (
                  <svg className="animate-spin w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {loading ? 'Signing in…' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400 font-medium">or</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Email input */}
              <div className="mb-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={e => { setEmailInput(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendOtp() }}
                  className="w-full rounded-2xl outline-none"
                  style={{
                    padding: '14px 16px',
                    fontSize: 15,
                    border: '2px solid #E5E7EB',
                    color: '#0A2F35',
                    fontFamily: 'var(--font-nunito, sans-serif)',
                  }}
                />
              </div>

              {error && <p className="text-sm text-red-500 text-center mb-3">{error}</p>}

              <button
                onClick={handleSendOtp}
                disabled={loading || !emailInput.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl font-semibold text-white disabled:opacity-50 mb-4"
                style={{
                  minHeight: 48,
                  background: 'oklch(0.48 0.17 196)',
                  fontSize: 15,
                  fontFamily: 'var(--font-nunito, sans-serif)',
                }}
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : null}
                {loading ? 'Sending…' : 'Send code →'}
              </button>

              <p className="text-xs text-slate-400 text-center mt-1">
                By continuing you agree to our terms. We never post without permission.
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.32,0.72,0,1); }
        /* Hide number input spinners */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </>
  )
}
