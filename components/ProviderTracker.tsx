'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// Invisible component — fires a tracking event silently on mount
export function TrackView({ providerId }: { providerId: string }) {
  useEffect(() => {
    fetch('/api/provider/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId, event_type: 'view' }),
    }).catch(() => {}) // silent fail
  }, [providerId])

  return null
}

function recordContact(providerId: string, providerName: string) {
  fetch('/api/provider/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider_id: providerId }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.contact_id) {
        sessionStorage.setItem(`pawlocal_contact_${providerId}`, data.contact_id)
        // Store in localStorage for the 24h prompt check
        const pending = JSON.parse(localStorage.getItem('pawlocal_pending_contacts') ?? '[]')
        pending.push({ contact_id: data.contact_id, provider_id: providerId, provider_name: providerName, created_at: Date.now() })
        localStorage.setItem('pawlocal_pending_contacts', JSON.stringify(pending))
      }
    })
    .catch(() => {})
}

export function TrackButton({
  providerId,
  eventType,
  providerName,
  children,
  ...props
}: {
  providerId: string
  eventType: 'whatsapp_click' | 'call_click'
  providerName?: string
  children: React.ReactNode
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  function handleClick() {
    fetch('/api/provider/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId, event_type: eventType }),
    }).catch(() => {})

    if (eventType === 'whatsapp_click') {
      recordContact(providerId, providerName ?? '')
    }
  }

  return (
    <a {...props} onClick={handleClick}>
      {children}
    </a>
  )
}

// ❤️ Save button — stores provider in localStorage for customer dashboard
export function SaveButton({
  providerId,
  providerName,
  categorySlug,
  whatsapp,
}: {
  providerId: string
  providerName: string
  categorySlug: string
  whatsapp: string
}) {
  const [saved, setSaved] = useState(false)
  const [showSaveNudge, setShowSaveNudge] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(true) // optimistic
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]') as { id: string }[]
      setSaved(list.some(p => p.id === providerId))
    } catch {}
    // Check auth silently
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsSignedIn(!!data.user)
    })
    return () => {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current)
    }
  }, [providerId])

  function toggle() {
    try {
      const list = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]') as {
        id: string; name: string; category_slug: string; whatsapp: string
      }[]
      let updated
      if (saved) {
        updated = list.filter(p => p.id !== providerId)
      } else {
        updated = [...list, { id: providerId, name: providerName, category_slug: categorySlug, whatsapp }]
        // Show nudge to sign in (only when not signed in)
        if (!isSignedIn) {
          setShowSaveNudge(true)
          if (nudgeTimer.current) clearTimeout(nudgeTimer.current)
          nudgeTimer.current = setTimeout(() => setShowSaveNudge(false), 4000)
        }
      }
      localStorage.setItem('pawlocal_saved', JSON.stringify(updated))
      setSaved(!saved)
    } catch {}
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Sign-in nudge tooltip */}
      {showSaveNudge && (
        <div className="absolute bottom-14 right-0 bg-slate-900 text-white text-xs rounded-xl px-3 py-2 w-52 shadow-lg z-10 leading-snug">
          ❤️ Saved! <a href="/my-account" className="underline font-semibold">Sign in</a> to sync across devices
          <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-slate-900 rotate-45" />
        </div>
      )}
      <button
        onClick={toggle}
        title={saved ? 'Remove from saved' : 'Save provider'}
        className="flex items-center justify-center w-12 h-12 rounded-2xl border border-border bg-white transition-all hover:border-red-300 active:scale-95 relative"
      >
        <span className="text-xl">{saved ? '❤️' : '🤍'}</span>
      </button>
    </div>
  )
}
