'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

const EASE = { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } as const

interface Props {
  inviteToken: string
  clientId: string
  petName: string
  ownerName: string | null
  providerName: string
  alreadyLinked: boolean
  isLoggedIn: boolean
}

export default function JoinReportsClient({
  petName, ownerName, providerName, alreadyLinked, isLoggedIn, inviteToken,
}: Props) {
  const [linking, setLinking] = useState(false)
  const [done, setDone] = useState(alreadyLinked && isLoggedIn)
  const supabase = createClient()

  async function handleGoogleSignIn() {
    setLinking(true)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/join-reports/${inviteToken}/link`,
      },
    })
  }

  const firstName = ownerName?.split(' ')[0] ?? 'there'
  const providerFirst = providerName.split(' ')[0]

  if (done) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 pb-12"
        style={{ background: 'linear-gradient(160deg, #F0FDF4 0%, #FFFBEB 100%)' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }}
          className="text-6xl mb-6">🐾</motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE, delay: 0.2 }}
          className="text-center">
          <h1 className="font-display text-2xl text-stone-900 mb-3">You&apos;re all set!</h1>
          <p className="text-stone-500 text-sm leading-relaxed mb-8">
            {petName}&apos;s reports from {providerFirst} will now appear in your account automatically.
          </p>
          <a href="/my-reports"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: 'oklch(0.48 0.17 196)', boxShadow: '0 4px 0 oklch(0.35 0.14 196)' }}>
            View {petName}&apos;s reports →
          </a>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col px-6 pb-12 pt-16"
      style={{ background: 'linear-gradient(160deg, #FFFBEB 0%, #F0FDF4 100%)' }}>

      {/* Big paw icon */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={EASE}
        className="flex justify-center mb-8">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
          style={{ background: 'oklch(0.48 0.17 196)', boxShadow: '0 6px 0 oklch(0.35 0.14 196)' }}>
          🐾
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE, delay: 0.1 }}
        className="text-center mb-10">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'oklch(0.48 0.17 196)' }}>
          PupStep Care Reports
        </p>
        <h1 className="font-display text-3xl text-stone-900 leading-tight mb-4">
          Hi {firstName}! {providerFirst} wants to<br />send you {petName}&apos;s reports
        </h1>
        <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
          After every walk or grooming session, you&apos;ll get a beautiful report — GPS route, photos, health notes — straight to your account.
        </p>
      </motion.div>

      {/* Preview card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE, delay: 0.2 }}
        className="rounded-3xl p-5 mb-8 mx-auto w-full max-w-sm"
        style={{ background: 'white', boxShadow: '0 8px 0 rgba(15,45,50,0.08), 0 20px 48px rgba(0,0,0,0.1)', border: '1.5px solid rgba(226,220,200,0.6)' }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'oklch(0.48 0.17 196)' }}>What you&apos;ll receive</p>
        {[
          { icon: '🗺️', text: 'Full GPS walk route with poop & pee markers' },
          { icon: '📸', text: 'Photos from every session' },
          { icon: '📋', text: 'Health notes — skin, coat, behaviour' },
          { icon: '📅', text: 'Complete history, always accessible' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 py-2">
            <span className="text-xl flex-shrink-0">{icon}</span>
            <span className="text-sm text-stone-600">{text}</span>
          </div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE, delay: 0.3 }}
        className="max-w-sm mx-auto w-full">
        <button
          onClick={handleGoogleSignIn}
          disabled={linking}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-stone-900 text-base transition-all mb-3"
          style={{ background: 'white', boxShadow: '0 4px 0 rgba(0,0,0,0.1), 0 0 0 1.5px rgba(0,0,0,0.08)', opacity: linking ? 0.7 : 1 }}
        >
          {linking ? (
            <span className="text-sm">Opening Google…</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </>
          )}
        </button>
        <p className="text-center text-xs text-stone-400">
          Free to join · No credit card · Cancel anytime
        </p>
      </motion.div>
    </div>
  )
}
