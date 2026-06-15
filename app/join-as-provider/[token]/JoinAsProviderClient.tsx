'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

const EASE = { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } as const

const TEXT = {
  en: {
    invited: (owner: string, pet: string) => `${owner} invited you to care for ${pet}`,
    subtitle: 'Send a report after every walk or session. The owner gets it automatically.',
    what_you_do: "What you'll do",
    step1: 'After each walk, open PupStep',
    step2: 'Fill in the walk details (duration, poop, pee, notes)',
    step3: 'Tap send — owner gets it instantly',
    join_btn: 'Join with Google',
    joining: 'Opening Google…',
    toggle_lang: 'हिंदी',
    expired_title: 'This invite has expired',
    expired_sub: 'Ask your employer to send you a new invite link.',
    accepted_title: 'Already linked!',
    accepted_sub: (pet: string) => `You're already set up to send reports for ${pet}.`,
    open_app: 'Open PupStep →',
    revoked_title: 'This invite is no longer valid',
    revoked_sub: 'The owner may have sent you a new link.',
    trust: 'Free to use · Secure Google login · No spam',
    your_role: 'Your role',
  },
  hi: {
    invited: (owner: string, pet: string) => `${owner} ne aapko ${pet} ki care ke liye invite kiya hai`,
    subtitle: 'Har walk ya session ke baad ek report bhejo. Owner ko automatically mil jaati hai.',
    what_you_do: 'Aapko kya karna hai',
    step1: 'Har walk ke baad PupStep kholo',
    step2: 'Walk ki details bharo (time, poop, pee, notes)',
    step3: 'Send karo — owner ko turant report milti hai',
    join_btn: 'Google se join karo',
    joining: 'Google khul raha hai…',
    toggle_lang: 'English',
    expired_title: 'Yeh invite expire ho gaya hai',
    expired_sub: 'Apne employer se naya invite link maango.',
    accepted_title: 'Pehle se linked hai!',
    accepted_sub: (pet: string) => `Aap pehle se ${pet} ki reports bhejne ke liye set hain.`,
    open_app: 'PupStep kholo →',
    revoked_title: 'Yeh invite ab valid nahi hai',
    revoked_sub: 'Owner ne aapko naya link bheja hoga.',
    trust: 'Bilkul free · Secure Google login · Koi spam nahi',
    your_role: 'Aapka kaam',
  },
}

const CLAY_CARD = {
  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
  boxShadow:
    'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
  border: '1px solid rgba(226,220,200,0.7)',
} as const

interface Props {
  inviteToken: string
  petName: string
  ownerFirstName: string
  isExpired: boolean
  isAlreadyAccepted: boolean
  isRevoked: boolean
  defaultHindi: boolean
}

export default function JoinAsProviderClient({
  inviteToken,
  petName,
  ownerFirstName,
  isExpired,
  isAlreadyAccepted,
  isRevoked,
  defaultHindi,
}: Props) {
  const [lang, setLang] = useState<'en' | 'hi'>(defaultHindi ? 'hi' : 'en')
  const [loading, setLoading] = useState(false)
  const t = TEXT[lang]

  // Track invite link click on mount — fire and forget
  useEffect(() => {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'invite_link_clicked', invite_token: inviteToken }),
    }).catch(() => {})
  }, [inviteToken])

  async function handleJoinWithGoogle() {
    setLoading(true)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/join-as-provider/${inviteToken}/link`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center px-4 py-8"
      style={{ background: '#FFFBEB' }}
    >
      <div className="w-full max-w-md">

        {/* Header: logo + language toggle */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={EASE}
        >
          <Image src="/logo.webp" alt="PupStep" width={120} height={44} className="h-9 w-auto" />
          <button
            onClick={() => setLang(l => (l === 'en' ? 'hi' : 'en'))}
            className="text-xs font-bold px-3 py-1.5 rounded-full border transition-colors"
            style={{
              borderColor: 'rgba(226,220,200,0.9)',
              color: 'oklch(0.48 0.17 196)',
              background: 'white',
            }}
          >
            {t.toggle_lang}
          </button>
        </motion.div>

        {/* ── EXPIRED STATE ── */}
        {isExpired && !isAlreadyAccepted && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={EASE}
            className="rounded-3xl p-8 text-center"
            style={CLAY_CARD}
          >
            <div className="text-5xl mb-4">⏰</div>
            <h1 className="font-display text-2xl text-stone-900 mb-2">{t.expired_title}</h1>
            <p className="text-sm text-stone-500 leading-relaxed">{t.expired_sub}</p>
          </motion.div>
        )}

        {/* ── REVOKED STATE ── */}
        {isRevoked && !isAlreadyAccepted && !isExpired && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={EASE}
            className="rounded-3xl p-8 text-center"
            style={CLAY_CARD}
          >
            <div className="text-5xl mb-4">🔗</div>
            <h1 className="font-display text-2xl text-stone-900 mb-2">{t.revoked_title}</h1>
            <p className="text-sm text-stone-500 leading-relaxed">{t.revoked_sub}</p>
          </motion.div>
        )}

        {/* ── ALREADY ACCEPTED ── */}
        {isAlreadyAccepted && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={EASE}
            className="rounded-3xl p-8 text-center"
            style={CLAY_CARD}
          >
            <div className="text-5xl mb-4">✅</div>
            <h1 className="font-display text-2xl text-stone-900 mb-2">{t.accepted_title}</h1>
            <p className="text-sm text-stone-500 mb-6 leading-relaxed">{t.accepted_sub(petName)}</p>
            <a
              href="/pro/dashboard"
              className="block w-full py-4 rounded-2xl text-center font-bold text-white text-base"
              style={{
                background: 'oklch(0.48 0.17 196)',
                boxShadow: '0 4px 0 oklch(0.35 0.14 196)',
              }}
            >
              {t.open_app}
            </a>
          </motion.div>
        )}

        {/* ── NORMAL INVITE STATE ── */}
        {!isExpired && !isRevoked && !isAlreadyAccepted && (
          <>
            {/* Invite card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={EASE}
              className="rounded-3xl p-6 mb-4"
              style={CLAY_CARD}
            >
              {/* Dog + owner context */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                  style={{ background: 'oklch(0.94 0.06 196)' }}
                >
                  🐕
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-0.5">
                    {t.your_role}
                  </p>
                  <h1 className="font-display text-xl text-stone-900 leading-tight">
                    {t.invited(ownerFirstName, petName)}
                  </h1>
                </div>
              </div>

              <p className="text-sm text-stone-500 leading-relaxed mb-6">{t.subtitle}</p>

              {/* Steps */}
              <div className="space-y-3 mb-6">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
                  {t.what_you_do}
                </p>
                {[t.step1, t.step2, t.step3].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'oklch(0.48 0.17 196)', marginTop: 1 }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm text-stone-700 leading-snug">{step}</p>
                  </div>
                ))}
              </div>

              {/* Google join button */}
              <motion.button
                onClick={handleJoinWithGoogle}
                disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2.5 transition-opacity disabled:opacity-60"
                style={{
                  background: 'oklch(0.48 0.17 196)',
                  boxShadow: '0 4px 0 oklch(0.35 0.14 196)',
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12 }}
              >
                {!loading && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                    <path
                      fill="white"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="rgba(255,255,255,0.8)"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="rgba(255,255,255,0.6)"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="rgba(255,255,255,0.7)"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {loading ? t.joining : t.join_btn}
              </motion.button>
            </motion.div>

            {/* Trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...EASE, delay: 0.2 }}
              className="text-center text-xs text-stone-400"
            >
              {t.trust}
            </motion.p>
          </>
        )}

      </div>
    </div>
  )
}
