import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST — save a push subscription for the current provider
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id').eq('email', user.email).eq('status', 'approved').maybeSingle()
  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subscription = await req.json()
  if (!subscription?.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

  // Upsert by endpoint so re-subscribing doesn't duplicate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin().from('push_subscriptions') as any)
    .upsert({
      provider_id: provider.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh ?? null,
      auth: subscription.keys?.auth ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

  return NextResponse.json({ ok: true })
}

// DELETE — remove a push subscription
export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ ok: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin().from('push_subscriptions') as any).delete().eq('endpoint', endpoint)
  return NextResponse.json({ ok: true })
}
