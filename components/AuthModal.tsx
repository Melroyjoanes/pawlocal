'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  redirectTo?: string
  message?: string // context message e.g. "Sign in to save providers"
}

type Step = 'choose' | 'phone' | 'otp'

export default function AuthModal({ open, onClose, redirectTo, message }: AuthModalProps) {
  const [step, setStep] = useState<Step>('choose')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const supabase = createClient()

  // Reset on open
  useEffect(() => {
    if (open) { setStep('choose'); setPhone(''); setOtp(['','','','','','']); setError('') }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleGoogle() {
    setLoading(true)
    setError('')
    // Use NEXT_PUBLIC_SITE_URL if set (ensures production URL in all environments),
    // otherwise fall back to current origin (works for local dev).
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/')}`,
      },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const normalized = '+91' + phone.replace(/\D/g, '').replace(/^91/, '').slice(-10)
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized })
    if (error) { setError(error.message); setLoading(false); return }
    setStep('otp')
    setLoading(false)
    setTimeout(() => otpRefs.current[0]?.focus(), 100)
  }

  async function handleOtpVerify() {
    const code = otp.join('')
    if (code.length < 6) return
    setLoading(true)
    setError('')
    const normalized = '+91' + phone.replace(/\D/g, '').replace(/^91/, '').slice(-10)
    const { error } = await supabase.auth.verifyOtp({ phone: normalized, token: code, type: 'sms' })
    if (error) { setError('Incorrect code. Try again.'); setLoading(false); return }
    onClose()
    if (redirectTo) window.location.href = redirectTo
    else window.location.reload()
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
    if (next.every(d => d !== '')) {
      // Auto-verify when all 6 digits entered
      const code = next.join('')
      const normalized = '+91' + phone.replace(/\D/g, '').replace(/^91/, '').slice(-10)
      setLoading(true)
      supabase.auth.verifyOtp({ phone: normalized, token: code, type: 'sms' }).then(({ error }) => {
        if (error) { setError('Incorrect code. Try again.'); setLoading(false); setOtp(['','','','','','']); otpRefs.current[0]?.focus(); return }
        onClose()
        if (redirectTo) window.location.href = redirectTo
        else window.location.reload()
      })
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-6 pt-4 pb-2">
          {/* Context message */}
          {message && step === 'choose' && (
            <p className="text-xs text-[var(--pl-teal)] font-semibold text-center mb-4 bg-teal-50 rounded-xl py-2 px-3">
              {message}
            </p>
          )}

          {/* ── Step: choose method ── */}
          {step === 'choose' && (
            <>
              <h2 className="text-xl font-bold text-slate-900 text-center mb-1">Welcome to PawLocal</h2>
              <p className="text-sm text-slate-500 text-center mb-6">Sign in to continue</p>

              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 rounded-2xl py-3.5 font-semibold text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50 mb-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <button
                onClick={() => setStep('phone')}
                className="w-full flex items-center justify-center gap-2 border border-border rounded-2xl py-3.5 font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-all"
              >
                📱 Use phone number (OTP)
              </button>

              {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

              <p className="text-xs text-slate-400 text-center mt-5">
                By continuing you agree to our terms. We never post without permission.
              </p>
            </>
          )}

          {/* ── Step: enter phone ── */}
          {step === 'phone' && (
            <>
              <button onClick={() => setStep('choose')} className="text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
                ← Back
              </button>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Enter your number</h2>
              <p className="text-sm text-slate-500 mb-6">We'll send a 6-digit code via SMS</p>

              <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-2 border-slate-200 focus-within:border-[var(--pl-teal)] rounded-2xl px-4 py-3.5 transition-colors">
                  <span className="text-sm font-semibold text-slate-400">🇮🇳 +91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="flex-1 text-base font-medium outline-none bg-transparent"
                    autoFocus
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || phone.replace(/\D/g, '').length < 10}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)', color: '#451A03', boxShadow: '0 4px 0px rgba(120,53,15,0.28)' }}
                >
                  {loading ? 'Sending…' : 'Send OTP →'}
                </button>
              </form>
            </>
          )}

          {/* ── Step: enter OTP ── */}
          {step === 'otp' && (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Enter the code</h2>
              <p className="text-sm text-slate-500 mb-6">
                Sent to +91 {phone.replace(/\D/g, '').slice(-10)}
              </p>

              <div className="flex gap-2 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold border-2 border-slate-200 focus:border-[var(--pl-teal)] rounded-xl outline-none transition-colors bg-white"
                  />
                ))}
              </div>

              {error && <p className="text-sm text-red-500 text-center mb-3">{error}</p>}

              {loading && <p className="text-sm text-slate-500 text-center">Verifying…</p>}

              <button
                onClick={() => { setStep('phone'); setOtp(['','','','','','']) }}
                className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-2"
              >
                Didn't receive it? Resend
              </button>
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
      `}</style>
    </>
  )
}
