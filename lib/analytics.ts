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
