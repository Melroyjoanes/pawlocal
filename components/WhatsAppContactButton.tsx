'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  providerId: string
  providerName: string
}

export default function WhatsAppContactButton({ providerId, providerName }: Props) {
  const storageKey = `pawlocal_contacted_${providerId}`
  const [hasContacted, setHasContacted] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    setHasContacted(!!localStorage.getItem(storageKey))
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsSignedIn(!!data.user)
      setAuthChecked(true)
    })
  }, [storageKey])

  function scrollToReview() {
    document.getElementById('review-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleContact() {
    localStorage.setItem(storageKey, '1')
    setHasContacted(true)
    setShowNudge(true)
    setTimeout(() => {
      setShowNudge(false)
      window.open(`/api/provider/whatsapp-redirect/${providerId}`, '_blank', 'noopener,noreferrer')
    }, 1800)
  }

  return (
    <div className="flex flex-col gap-2 flex-1">
      {/* "You've contacted" reminder — only for signed-in users */}
      {hasContacted && !showNudge && isSignedIn && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <span className="text-xs text-amber-700">You contacted {providerName} 👋</span>
          <button
            onClick={scrollToReview}
            className="text-xs font-bold text-amber-800 hover:underline"
          >
            Leave a review →
          </button>
        </div>
      )}

      {/* Nudge toast shown briefly after tapping */}
      {showNudge && (
        <div className="flex flex-col gap-1.5 bg-slate-900 text-white rounded-xl px-4 py-3 text-xs font-medium">
          <span>💬 Opening WhatsApp…</span>
          <span className="opacity-70">After your session, come back and share how it went 🌟</span>
        </div>
      )}

      {/* Main CTA — gated by auth */}
      {!authChecked ? (
        /* Loading skeleton — prevents flashing wrong button */
        <div className="w-full h-[52px] rounded-2xl bg-stone-100 animate-pulse" />
      ) : isSignedIn ? (
        /* Signed-in — direct contact via server-side redirect (real number never in HTML) */
        <button
          type="button"
          onClick={handleContact}
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-4 rounded-2xl font-semibold transition-colors min-h-[52px]"
        >
          💬 WhatsApp
        </button>
      ) : (
        /* Not signed in — show sign-in gate */
        <a
          href={`/account?next=/provider/${providerId}`}
          className="flex flex-col items-center justify-center gap-0.5 w-full bg-[var(--pl-teal)] hover:opacity-90 active:opacity-80 text-white py-3 rounded-2xl font-semibold transition-all min-h-[52px]"
        >
          <span className="text-sm font-bold">🔒 Sign in to contact</span>
          <span className="text-[10px] opacity-80 font-normal">Free · Takes 30 seconds</span>
        </a>
      )}
    </div>
  )
}
