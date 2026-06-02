'use client'

import { useEffect, useState } from 'react'

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

export function TrackButton({
  providerId,
  eventType,
  children,
  ...props
}: {
  providerId: string
  eventType: 'whatsapp_click' | 'call_click'
  children: React.ReactNode
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  function handleClick() {
    fetch('/api/provider/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId, event_type: eventType }),
    }).catch(() => {})
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

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('pawlocal_saved') ?? '[]') as { id: string }[]
      setSaved(list.some(p => p.id === providerId))
    } catch {}
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
      }
      localStorage.setItem('pawlocal_saved', JSON.stringify(updated))
      setSaved(!saved)
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      title={saved ? 'Remove from saved' : 'Save provider'}
      className="flex items-center justify-center w-12 h-12 rounded-2xl border border-border bg-white transition-all hover:border-red-300 active:scale-95"
    >
      <span className="text-xl">{saved ? '❤️' : '🤍'}</span>
    </button>
  )
}
