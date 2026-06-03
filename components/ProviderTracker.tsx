'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuthModal from '@/components/AuthModal'

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
// Requires auth: opens AuthModal if not signed in
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
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]') as { id: string }[]
      setSaved(list.some(p => p.id === providerId))
    } catch {}
  }, [providerId])

  async function toggle() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setAuthOpen(true)
      return
    }

    try {
      const list = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]') as {
        id: string; name: string; category_slug: string; whatsapp: string
      }[]
      let updated
      if (saved) {
        updated = list.filter(p => p.id !== providerId)
      } else {
        updated = [...list, { id: providerId, name: providerName, category_slug: categorySlug, whatsapp }]
      }
      localStorage.setItem('pawlocal_saved', JSON.stringify(updated))
      setSaved(!saved)
    } catch {}
  }

  return (
    <>
      <button
        onClick={toggle}
        title={saved ? 'Remove from saved' : 'Save provider'}
        className="flex items-center justify-center w-12 h-12 rounded-2xl border border-border bg-white transition-all hover:border-red-300 active:scale-95"
      >
        <span className="text-xl">{saved ? '❤️' : '🤍'}</span>
      </button>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        message="Sign in to save providers"
        redirectTo={typeof window !== 'undefined' ? window.location.pathname : undefined}
      />
    </>
  )
}
