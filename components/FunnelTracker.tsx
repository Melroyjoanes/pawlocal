'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

// Site-wide CTA click tracking via one delegated listener, mounted once in
// the root layout. Fires a GA4 `cta_click` for any internal link pointing at
// a funnel destination — so every "Set up your dog", "Sign in", "See
// pricing" button across the landing page, blog, FAQ, and app shell is
// captured without having to hand-wire trackEvent() into each of the ~30
// call sites (several of which live in files another workstream is
// actively editing).
const FUNNEL_DESTINATIONS = ['/setup', '/login', '/upgrade']

export default function FunnelTracker() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      const path = href.split('?')[0]
      if (!FUNNEL_DESTINATIONS.some(d => path === d || path.startsWith(d + '/'))) return

      trackEvent('cta_click', {
        link_href: href,
        link_label: (anchor.textContent ?? '').trim().slice(0, 60),
        page_path: window.location.pathname,
      })
    }

    // Capture phase so the event fires even when navigation starts immediately.
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  return null
}
