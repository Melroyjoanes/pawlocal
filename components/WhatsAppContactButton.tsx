'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  providerId: string
  providerName: string
  whatsappUrl: string
}

export default function WhatsAppContactButton({ providerId, providerName, whatsappUrl }: Props) {
  const storageKey = `pawlocal_contacted_${providerId}`
  const [hasContacted, setHasContacted] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(true) // optimistic — check async
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

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    // Mark as contacted
    localStorage.setItem(storageKey, '1')
    setHasContacted(true)
    // Show nudge briefly, then open WhatsApp
    setShowNudge(true)
    setTimeout(() => {
      setShowNudge(false)
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    }, 2200)
  }

  return (
    <div className="flex flex-col gap-2 flex-1">
      {/* "You've contacted" reminder — shown on return visits */}
      {hasContacted && !showNudge && (
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

      {/* Nudge toast — shown for ~2s after tapping */}
      {showNudge && (
        <div className="flex flex-col gap-1.5 bg-slate-900 text-white rounded-xl px-4 py-3 text-xs font-medium">
          <span>💬 Opening WhatsApp…</span>
          {authChecked && !isSignedIn && (
            <span className="opacity-80">
              💡 <a href="/my-account" className="underline font-semibold" onClick={e => e.stopPropagation()}>Sign in</a> to save {providerName} and get notified about deals
            </span>
          )}
          {(isSignedIn || !authChecked) && (
            <span className="opacity-70">After your session, come back and share how it went 🌟</span>
          )}
        </div>
      )}

      {/* Soft sign-in nudge strip — only when not signed in, shown once after first contact */}
      {authChecked && !isSignedIn && hasContacted && !showNudge && (
        <div className="flex items-center justify-between bg-slate-50 border border-border rounded-xl px-3 py-2">
          <p className="text-xs text-slate-600">Save {providerName} to your account</p>
          <a
            href="/my-account"
            className="text-xs font-semibold text-[var(--pl-teal)] hover:underline flex-shrink-0 ml-2"
          >
            Sign in →
          </a>
        </div>
      )}

      {/* WhatsApp button */}
      <a
        href={whatsappUrl}
        onClick={handleClick}
        className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-4 rounded-2xl font-semibold transition-colors min-h-[52px]"
      >
        💬 WhatsApp
      </a>
    </div>
  )
}
