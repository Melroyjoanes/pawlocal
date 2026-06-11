'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuthModal from '@/components/AuthModal'

interface Props {
  providerId: string
  providerName: string
  categorySlug: string
  whatsapp: string
  phone?: string | null
  isOwner: boolean
  shareUrl: string
}

export default function ProviderCTABar({
  providerId,
  providerName,
  categorySlug,
  whatsapp,
  phone,
  isOwner,
  shareUrl,
}: Props) {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'whatsapp' | 'call' | 'save' | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsSignedIn(!!data.user)
    })
    // Check saved state
    try {
      const list = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]') as { id: string }[]
      setSaved(list.some(p => p.id === providerId))
    } catch {}
  }, [providerId])

  function requireAuth(action: 'whatsapp' | 'call' | 'save') {
    if (isSignedIn) {
      executeAction(action)
    } else {
      setPendingAction(action)
      setAuthOpen(true)
    }
  }

  function track(event_type: 'whatsapp_click' | 'call_click') {
    // sendBeacon is guaranteed to fire even when the page navigates away (call clicks).
    // Falls back to fetch for browsers without sendBeacon support.
    const payload = JSON.stringify({ provider_id: providerId, event_type })
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/provider/track', blob)
    } else {
      fetch('/api/provider/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
  }

  function executeAction(action: 'whatsapp' | 'call' | 'save') {
    if (action === 'whatsapp') {
      track('whatsapp_click')
      const digits = whatsapp.replace(/\D/g, '').slice(-10)
      window.open(`https://wa.me/91${digits}`, '_blank', 'noopener,noreferrer')
    } else if (action === 'call') {
      track('call_click')
      window.location.href = `tel:${phone}`
    } else if (action === 'save') {
      try {
        const list = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]') as {
          id: string; name: string; category_slug: string; whatsapp: string
        }[]
        const alreadySaved = list.some(p => p.id === providerId)
        const updated = alreadySaved
          ? list.filter(p => p.id !== providerId)
          : [...list, { id: providerId, name: providerName, category_slug: categorySlug, whatsapp }]
        localStorage.setItem('pawlocal_saved', JSON.stringify(updated))
        setSaved(!alreadySaved)
      } catch {}
    }
  }

  function handleAuthSuccess() {
    setIsSignedIn(true)
    setAuthOpen(false)
    if (pendingAction) {
      executeAction(pendingAction)
      setPendingAction(null)
    }
  }

  if (isOwner) {
    return (
      <div
        className="sticky bottom-0 -mx-4 px-4 pt-3 bg-background/95 backdrop-blur-sm flex flex-col gap-2 border-t border-border/50"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <a
          href="/pro/profile"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm text-white transition-all clay-btn-teal"
        >
          ✏️ Edit your profile
        </a>
      </div>
    )
  }

  return (
    <>
      <AuthModal
        open={authOpen}
        onClose={() => { setAuthOpen(false); setPendingAction(null) }}
        message={
          pendingAction === 'whatsapp' ? `Sign in to contact ${providerName} on WhatsApp` :
          pendingAction === 'call'     ? `Sign in to call ${providerName}` :
          pendingAction === 'save'     ? `Sign in to save ${providerName} to your list` :
          'Sign in to continue'
        }
        redirectTo={`/provider/${providerId}`}
      />

      <div
        className="sticky bottom-0 -mx-4 px-4 pt-3 bg-background/95 backdrop-blur-sm flex flex-col gap-2 border-t border-border/50"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {/* Primary row — WhatsApp + Call */}
        <div className="flex gap-2">
          {/* WhatsApp — auth gated */}
          <button
            onClick={() => requireAuth('whatsapp')}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm text-white clay-btn-teal transition-all"
          >
            💬 WhatsApp
          </button>

          {/* Call — auth gated */}
          {phone && (
            <button
              onClick={() => requireAuth('call')}
              className="w-14 h-14 flex-shrink-0 rounded-2xl clay-btn-ghost font-semibold flex items-center justify-center text-xl"
              title="Call provider"
            >
              📞
            </button>
          )}
        </div>

        {/* Secondary row — Save + Share */}
        <div className="flex gap-2">
          {/* Save — auth gated, red to drive action */}
          <button
            onClick={() => requireAuth('save')}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold py-3.5 rounded-2xl active:scale-95 transition-all"
            style={saved ? {
              background: 'oklch(0.96 0.04 25)',
              border: '1px solid oklch(0.82 0.10 25)',
              color: 'oklch(0.48 0.20 25)',
              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.8)',
            } : {
              background: 'linear-gradient(160deg, oklch(0.60 0.22 25) 0%, oklch(0.52 0.24 27) 100%)',
              border: '1px solid oklch(0.44 0.20 25 / 0.3)',
              color: 'white',
              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.2), 0 4px 14px oklch(0.52 0.24 27 / 0.35)',
            }}
          >
            <span className="text-base">{saved ? '❤️' : '🤍'}</span>
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Share — stays public (just a URL) */}
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground bg-white border border-border rounded-2xl py-3 hover:text-green-600 hover:border-green-200 transition-colors"
          >
            ↗ Share
          </a>
        </div>

        {/* Auth nudge — shown while signed out, below buttons */}
        {isSignedIn === false && (
          <p className="text-center text-[11px] text-slate-400 pb-1">
            Sign in to contact providers and save your favourites
          </p>
        )}
      </div>
    </>
  )
}
