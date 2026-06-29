'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  next: string
}

type EmailView = 'input' | 'otp'

export default function LoginClient({ next }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailView, setEmailView] = useState<EmailView>('input')
  const [emailInput, setEmailInput] = useState('')
  const [otpCode, setOtpCode] = useState('')

  async function handleGoogle() {
    setLoading(true)
    setError('')
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
  }

  async function handleSendOtp() {
    if (!emailInput.trim()) { setError('Please enter your email'); return }
    setLoading(true)
    setError('')
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: emailInput.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (otpError) {
      setError(otpError.message)
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
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: emailInput.trim(),
      token: otpCode.trim(),
      type: 'email',
    })
    if (verifyError) {
      setError('Incorrect code. Please try again.')
      setLoading(false)
      return
    }
    setLoading(false)
    router.push(next)
  }

  async function handleResendOtp() {
    setError('')
    setOtpCode('')
    await supabase.auth.signInWithOtp({
      email: emailInput.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#FFFBEB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/">
          <Image
            src="/logo.webp"
            alt="PupStep"
            width={130}
            height={48}
            style={{ height: 40, width: 'auto' }}
            priority
          />
        </Link>
      </div>

      {/* Auth card */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 4px 0 rgba(0,0,0,0.06), 0 12px 36px rgba(10,47,53,0.10)',
          padding: '28px 24px',
        }}
      >
        {emailView === 'otp' ? (
          /* ── OTP view ── */
          <>
            <h2
              style={{
                textAlign: 'center',
                marginBottom: 4,
                fontFamily: 'var(--font-fredoka, sans-serif)',
                fontSize: 22,
                fontWeight: 700,
                color: '#0A2F35',
              }}
            >
              Enter the 6-digit code
            </h2>
            <p style={{ textAlign: 'center', marginBottom: 24, fontSize: 13, color: '#6B7280', fontFamily: 'var(--font-nunito, sans-serif)' }}>
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
              style={{
                width: '100%',
                textAlign: 'center',
                borderRadius: 16,
                outline: 'none',
                padding: '14px 16px',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '0.3em',
                border: '2px solid #E5E7EB',
                color: '#0A2F35',
                fontFamily: 'var(--font-fredoka, monospace)',
                boxSizing: 'border-box',
                marginBottom: 16,
                MozAppearance: 'textfield',
              } as React.CSSProperties}
            />

            {error && (
              <p style={{ fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 12 }}>{error}</p>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otpCode.length !== 6}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 16,
                fontWeight: 700,
                color: '#fff',
                background: 'oklch(0.48 0.17 196)',
                minHeight: 52,
                fontSize: 16,
                fontFamily: 'var(--font-fredoka, sans-serif)',
                border: 'none',
                cursor: loading || otpCode.length !== 6 ? 'not-allowed' : 'pointer',
                opacity: loading || otpCode.length !== 6 ? 0.5 : 1,
                marginBottom: 16,
              }}
            >
              {loading ? (
                <svg className="animate-spin" style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : null}
              {loading ? 'Verifying…' : 'Verify code →'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => { setEmailView('input'); setOtpCode(''); setError('') }}
                style={{ fontSize: 13, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-nunito, sans-serif)' }}
              >
                ← Use different email
              </button>
              <button
                onClick={handleResendOtp}
                style={{ fontSize: 13, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-nunito, sans-serif)' }}
              >
                Resend code
              </button>
            </div>
          </>
        ) : (
          /* ── Email input view ── */
          <>
            <h2
              style={{
                textAlign: 'center',
                marginBottom: 4,
                fontFamily: 'var(--font-fredoka, sans-serif)',
                fontSize: 22,
                fontWeight: 700,
                color: '#0A2F35',
              }}
            >
              Welcome to PupStep
            </h2>
            <p
              style={{
                textAlign: 'center',
                marginBottom: 24,
                fontSize: 13,
                color: '#6B7280',
                fontFamily: 'var(--font-nunito, sans-serif)',
              }}
            >
              Sign in to contact providers and save favourites
            </p>

            {/* Google sign-in */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                border: '2px solid #E5E7EB',
                borderRadius: 16,
                padding: '14px 16px',
                fontWeight: 600,
                fontSize: 14,
                color: '#374151',
                background: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                marginBottom: 16,
                fontFamily: 'var(--font-nunito, sans-serif)',
                transition: 'border-color 0.15s',
              }}
            >
              {loading ? (
                <svg style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#F3F4F6' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, fontFamily: 'var(--font-nunito, sans-serif)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#F3F4F6' }} />
            </div>

            {/* Email input */}
            <input
              type="email"
              placeholder="your@email.com"
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleSendOtp() }}
              style={{
                width: '100%',
                borderRadius: 16,
                outline: 'none',
                padding: '14px 16px',
                fontSize: 15,
                border: '2px solid #E5E7EB',
                color: '#0A2F35',
                fontFamily: 'var(--font-nunito, sans-serif)',
                boxSizing: 'border-box',
                marginBottom: 12,
              } as React.CSSProperties}
            />

            {error && (
              <p style={{ fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 12 }}>{error}</p>
            )}

            <button
              onClick={handleSendOtp}
              disabled={loading || !emailInput.trim()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 16,
                fontWeight: 600,
                color: '#fff',
                background: 'oklch(0.48 0.17 196)',
                minHeight: 48,
                fontSize: 15,
                fontFamily: 'var(--font-nunito, sans-serif)',
                border: 'none',
                cursor: loading || !emailInput.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !emailInput.trim() ? 0.5 : 1,
                marginBottom: 16,
              }}
            >
              {loading ? (
                <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : null}
              {loading ? 'Sending…' : 'Send code →'}
            </button>
          </>
        )}
      </div>

      {/* Footer legal */}
      <p
        style={{
          fontFamily: 'var(--font-nunito, sans-serif)',
          fontSize: 12,
          color: '#9CA3AF',
          marginTop: 20,
          textAlign: 'center',
          maxWidth: 320,
          lineHeight: 1.6,
        }}
      >
        By continuing you agree to our{' '}
        <Link href="/terms" style={{ color: 'oklch(0.48 0.17 196)', textDecoration: 'none' }}>Terms</Link>
        {' '}and{' '}
        <Link href="/privacy-policy" style={{ color: 'oklch(0.48 0.17 196)', textDecoration: 'none' }}>Privacy Policy</Link>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Hide number input spinners */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  )
}
