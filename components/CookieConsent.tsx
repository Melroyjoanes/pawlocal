'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { motion, AnimatePresence } from 'framer-motion'
import { CLAY_SHADOW_CREAM, CLAY_SHADOW_ORANGE_SM, CLAY_SHADOW_TEAL_OUTLINE } from '@/lib/clayShadows'

const CONSENT_KEY = 'pupstep_cookie_consent'
type Consent = 'accepted' | 'declined'

function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Loads GA4 only after explicit consent. Gating the gtag.js load (not just
// the events) means no _ga cookie is ever set on a visitor's browser until
// they've actively accepted — this is what makes the banner load-bearing
// for DPDP Act compliance, not just decorative.
export default function CookieConsent({ gaId }: { gaId?: string }) {
  const [consent, setConsent] = useState<Consent | null>(null)
  const [checked, setChecked] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY)
    if (stored === 'accepted' || stored === 'declined') setConsent(stored)
    setChecked(true)
  }, [])

  function choose(value: Consent) {
    window.localStorage.setItem(CONSENT_KEY, value)
    setConsent(value)
  }

  return (
    <>
      {gaId && consent === 'accepted' && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      <AnimatePresence>
        {checked && consent === null && (
          <motion.div
            role="dialog"
            aria-label="Cookie preferences"
            initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 24 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
            className="fixed left-0 right-0 z-[100] flex justify-center px-4"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
          >
            <div
              className="max-w-md w-full p-4"
              style={{
                borderRadius: 24,
                background: 'oklch(0.995 0.005 85)',
                boxShadow: CLAY_SHADOW_CREAM,
              }}
            >
              <p
                className="text-sm font-bold text-slate-900"
                style={{ fontFamily: 'var(--font-fredoka)' }}
              >
                We use cookies 🍪
              </p>
              <p
                className="text-xs text-slate-600 mt-1.5 leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                We use Google Analytics to understand how PupStep is used, so we
                can improve it. No data is sold or shared with advertisers.
              </p>
              <div className="flex gap-2.5 mt-3.5">
                <button
                  onClick={() => choose('declined')}
                  className="flex-1 rounded-2xl text-xs font-bold active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.48_0.17_196)]"
                  style={{
                    fontFamily: 'var(--font-nunito)',
                    background: '#fff',
                    color: 'oklch(0.48 0.17 196)',
                    border: '1.5px solid oklch(0.48 0.17 196)',
                    boxShadow: CLAY_SHADOW_TEAL_OUTLINE,
                    minHeight: 44,
                  }}
                >
                  Decline
                </button>
                <button
                  onClick={() => choose('accepted')}
                  className="flex-1 rounded-2xl text-xs font-bold active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#451A03]"
                  style={{
                    fontFamily: 'var(--font-nunito)',
                    background: 'linear-gradient(160deg, #FF8C52 0%, #F56B22 100%)',
                    color: '#451A03',
                    boxShadow: CLAY_SHADOW_ORANGE_SM,
                    minHeight: 44,
                  }}
                >
                  Accept
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
