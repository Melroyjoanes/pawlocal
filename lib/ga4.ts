// Server-side GA4 event tracking via the Measurement Protocol — used for the
// revenue-critical events (purchase, trial_start, subscription_cancelled)
// that must not be lost to a closed tab, an ad-blocker, or a network blip
// between the client action and the browser sending its own beacon.
//
// Requires GA4_API_SECRET (create under GA4 Admin -> Data Streams -> your
// web stream -> Measurement Protocol API secrets). Until that's set, every
// call here is a safe no-op — nothing breaks, events are just not sent yet.

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const API_SECRET = process.env.GA4_API_SECRET

type Ga4Event = {
  name: string
  params?: Record<string, unknown>
}

// clientId ties this server-side event to the same GA4 session as the
// browser that triggered it — pass the value from getGaClientId() (lib/analytics.ts)
// through to the API route when available. Falls back to the Supabase user id
// (still gives correct event counts, just won't merge into that user's
// client-side session in GA4's UI).
export async function sendGA4Event(clientId: string, event: Ga4Event): Promise<void> {
  if (!MEASUREMENT_ID || !API_SECRET) return // not configured yet — no-op

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
      {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          events: [{ name: event.name, params: event.params ?? {} }],
        }),
      }
    )
  } catch {
    // Never let analytics failures affect the request that triggered them
  }
}
