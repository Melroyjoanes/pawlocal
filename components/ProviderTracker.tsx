'use client'

import { useEffect } from 'react'

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
