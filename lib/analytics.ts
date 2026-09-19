// Client-side GA4 event tracking. Safe to call even if gtag hasn't loaded
// (e.g. NEXT_PUBLIC_GA_MEASUREMENT_ID unset in local dev) — no-ops silently.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void
  }
}

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

// First-party event log (Supabase analytics_events), separate from GA4 above.
// GA4 is fine for aggregate trends but we can't join it to a walk report, a
// dog, or a user — the admin panel's per-report view counts and the signup
// funnel both read the Supabase table, so events that need to be attributed
// to a specific row have to be sent here as well as to GA4.
//
// event_type must be in ALLOWED_EVENTS in app/api/track/route.ts, or the
// endpoint returns 400 and the event is silently dropped. That is exactly how
// onboarding_skipped was lost, so keep the two lists in sync.
export function trackServer(
  eventType: string,
  payload: { report_token?: string; invite_token?: string; metadata?: Record<string, unknown> } = {},
): void {
  if (typeof window === 'undefined') return
  // keepalive so the beacon still goes out when the tap navigates away — a
  // plain fetch is cancelled on unload, which is how every outbound-link
  // event gets lost.
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: eventType, ...payload }),
    keepalive: true,
  }).catch(() => {})
}

// Reads the GA4 client_id from the _ga cookie (format: GA1.1.<client_id_part1>.<client_id_part2>)
// so server-side Measurement Protocol events can be tied to the same browser session as
// client-side events, instead of using an unrelated identifier.
export function getGaClientId(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/)
  if (!match) return null
  const raw = decodeURIComponent(match[1])
  // Strip the "GA1.1." prefix, keep "<part1>.<part2>" as the client_id
  const parts = raw.split('.')
  if (parts.length < 4) return null
  return `${parts[2]}.${parts[3]}`
}
