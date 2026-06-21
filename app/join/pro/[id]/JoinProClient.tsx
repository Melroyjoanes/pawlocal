'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

const EASE = { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } as const

const CATEGORY_LABEL: Record<string, string> = {
  'dog-walking': 'Dog Walker',
  'grooming': 'Groomer',
  'pet-store': 'Pet Store',
  'vet': 'Vet',
}

interface Props {
  providerId: string
  providerName: string
  providerPhoto: string | null
  categorySlug: string
  neighbourhood: string
  isLoggedIn: boolean
  userEmail: string | null
}

export default function JoinProClient({
  providerId,
  providerName,
  providerPhoto,
  categorySlug,
  neighbourhood,
  isLoggedIn,
}: Props) {
  const [signingIn, setSigningIn] = useState(false)
  const [petName, setPetName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const supabase = createClient()
  const providerFirst = providerName.split(' ')[0]
  const categoryLabel = CATEGORY_LABEL[categorySlug] ?? 'Pet Care Provider'

  async function handleGoogleSignIn() {
    setSigningIn(true)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/join/pro/${providerId}`,
      },
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!petName.trim()) { setError("Your dog's name is required."); return }
    if (!whatsapp.trim()) { setError('Your WhatsApp number is required.'); return }
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/join/pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          pet_name: petName.trim(),
          owner_name: ownerName.trim() || null,
          owner_whatsapp: whatsapp.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 pb-12"
        style={{ background: 'linear-gradient(160deg, #F0FDF4 0%, #FFFBEB 100%)' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }}
          className="text-6xl mb-6"
        >🐾</motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...EASE, delay: 0.2 }}
          className="text-center"
        >
          <h1 className="font-display text-2xl text-stone-900 mb-3"
            style={{ fontFamily: 'var(--font-fredoka)' }}>
            You&apos;re connected!
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed mb-2 max-w-xs mx-auto"
            style={{ fontFamily: 'var(--font-nunito)' }}>
            After every session, {providerFirst} will log the walk and you&apos;ll get a GPS care report on WhatsApp.
          </p>
          <p className="text-stone-400 text-xs mb-8 max-w-xs mx-auto"
            style={{ fontFamily: 'var(--font-nunito)' }}>
            Save {providerFirst}&apos;s contact so you recognise the message.
          </p>
          <a href="/my-account"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base"
            style={{
              background: 'oklch(0.48 0.17 196)',
              boxShadow: '0 4px 0 oklch(0.35 0.14 196)',
              fontFamily: 'var(--font-fredoka)',
            }}>
            Go to my account →
          </a>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#FFFBEB' }}>
      {/* Header */}
      <div className="flex items-center justify-center pt-8 pb-2 px-6">
        <span className="text-xl font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
          PupStep 🐾
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 pb-10 max-w-md mx-auto w-full">

        {/* Provider card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={EASE}
          className="w-full mt-6 mb-6 rounded-3xl p-5 flex items-center gap-4"
          style={{ background: 'white', boxShadow: '0 4px 0 rgba(0,0,0,0.06), 0 12px 36px rgba(0,0,0,0.05)', border: '1px solid rgba(226,232,240,0.7)' }}
        >
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-teal-50 flex items-center justify-center">
            {providerPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={providerPhoto} alt={providerName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">🐕</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-0.5"
              style={{ fontFamily: 'var(--font-nunito)' }}>
              {categoryLabel} · {neighbourhood}
            </p>
            <h2 className="text-lg font-bold text-[#0A2F35] leading-tight"
              style={{ fontFamily: 'var(--font-fredoka)' }}>
              {providerName}
            </h2>
            <p className="text-xs text-stone-400 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
              Verified on PupStep
            </p>
          </div>
        </motion.div>

        {/* What happens explanation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...EASE, delay: 0.08 }}
          className="w-full mb-6"
        >
          <h1 className="text-xl font-bold text-[#0A2F35] text-center mb-3"
            style={{ fontFamily: 'var(--font-fredoka)' }}>
            Connect with {providerFirst}
          </h1>
          <div className="space-y-2.5">
            {[
              { icon: '📍', text: 'After every session, you get a GPS walk report' },
              { icon: '💬', text: 'Report arrives in your WhatsApp — no app needed' },
              { icon: '📋', text: 'Full care log saved to your account for your vet' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-3 px-4 py-2.5 rounded-xl bg-white border border-stone-100">
                <span className="text-base leading-none mt-0.5 flex-shrink-0">{icon}</span>
                <p className="text-sm text-stone-600 leading-snug" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sign in OR form */}
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div
              key="signin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ...EASE, delay: 0.14 }}
              className="w-full"
            >
              <p className="text-center text-sm text-stone-500 mb-4" style={{ fontFamily: 'var(--font-nunito)' }}>
                Sign in to set up your walk reports
              </p>
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base border-2 border-stone-200 bg-white text-stone-800 transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ fontFamily: 'var(--font-fredoka)', boxShadow: '0 2px 0 rgba(0,0,0,0.05)' }}
              >
                {signingIn ? (
                  <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {signingIn ? 'Opening Google…' : 'Continue with Google'}
              </button>
              <p className="text-center text-xs text-stone-400 mt-3" style={{ fontFamily: 'var(--font-nunito)' }}>
                New to PupStep? Your account is created automatically.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ...EASE, delay: 0.14 }}
              className="w-full"
            >
              <p className="text-center text-sm font-semibold text-teal-700 mb-4"
                style={{ fontFamily: 'var(--font-nunito)' }}>
                ✓ Signed in — tell us about your dog
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-stone-500 uppercase tracking-wide"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    Dog&apos;s name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={petName}
                    onChange={e => setPetName(e.target.value)}
                    placeholder="e.g. Bruno"
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-300"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-stone-500 uppercase tracking-wide"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    Your name <span className="text-stone-300 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Priya"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-300"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-stone-500 uppercase tracking-wide"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    Your WhatsApp number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    placeholder="91XXXXXXXXXX"
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-300"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  />
                  <p className="text-xs text-stone-400 mt-1 ml-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                    Walk reports will be sent here after every session
                  </p>
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
                    <p className="text-sm text-red-700 font-medium" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
                  style={{
                    background: 'oklch(0.48 0.17 196)',
                    boxShadow: '0 4px 0 oklch(0.35 0.14 196)',
                    fontFamily: 'var(--font-fredoka)',
                  }}
                >
                  {submitting ? 'Connecting…' : `Connect with ${providerFirst} →`}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
