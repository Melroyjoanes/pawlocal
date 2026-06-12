// Send a web push notification to a provider's subscriptions
// Requires: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL env vars
// To set up:
//   1. Run: npx web-push generate-vapid-keys
//   2. Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL to .env.local
//   3. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same public key> to .env.local
//   4. Install: pnpm add web-push && pnpm add -D @types/web-push

import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function sendPushToProvider(
  providerId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

  let webpush: typeof import('web-push')
  try {
    webpush = await import('web-push')
  } catch {
    console.warn('[push] web-push not installed — skipping notification')
    return
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? 'mailto:hello@pawlocal.in',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs } = await (admin().from('push_subscriptions') as any)
    .select('endpoint, p256dh, auth')
    .eq('provider_id', providerId)

  if (!subs?.length) return

  const payloadStr = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr
      ).catch(async (err: { statusCode?: number }) => {
        // 410 Gone = subscription expired, remove it
        if (err?.statusCode === 410) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin().from('push_subscriptions') as any).delete().eq('endpoint', sub.endpoint)
        }
      })
    )
  )
}
