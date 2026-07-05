import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const PLAN_DAYS: Record<string, number> = { monthly: 30 }
const PLAN_PAISE: Record<string, number> = { monthly: 19900 }

// Razorpay sends webhooks for payment events. This route handles:
// - payment.captured: payment succeeded → create/extend subscription
// - payment.failed: optional logging
//
// Webhook secret is set in Razorpay Dashboard → Webhooks → Secret.
// Add RAZORPAY_WEBHOOK_SECRET to Vercel env vars.

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook] RAZORPAY_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Verify webhook signature
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  if (expected !== signature) {
    console.warn('[webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event: string; payload: { payment: { entity: Record<string, unknown> } } }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only handle successful captures
  if (event.event !== 'payment.captured') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const payment = event.payload?.payment?.entity
  if (!payment) {
    return NextResponse.json({ error: 'No payment entity' }, { status: 400 })
  }

  const orderId = payment.order_id as string
  const paymentId = payment.id as string
  const amountPaise = payment.amount as number

  if (!orderId) {
    return NextResponse.json({ error: 'No order_id in payment' }, { status: 400 })
  }

  const db = admin()

  // Look up the Razorpay order to get user_id and plan from notes
  const credentials = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64')

  const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!orderRes.ok) {
    console.error('[webhook] Failed to fetch Razorpay order:', await orderRes.text())
    return NextResponse.json({ error: 'Could not fetch order' }, { status: 500 })
  }

  const order = await orderRes.json() as { notes?: { user_id?: string; plan?: string } }
  const userId = order.notes?.user_id
  const plan = order.notes?.plan ?? 'monthly'

  if (!userId) {
    console.error('[webhook] No user_id in order notes', orderId)
    return NextResponse.json({ error: 'No user_id in order' }, { status: 400 })
  }

  const days = PLAN_DAYS[plan] ?? 30
  const expiresAt = new Date(Date.now() + days * 86400 * 1000).toISOString()

  // Extend the existing active row if one exists, else insert a new one.
  // NOT a Supabase upsert(onConflict: 'user_id') — the only unique index on
  // subscriptions.user_id is PARTIAL (WHERE status = 'active', see migration
  // 032), which a plain ON CONFLICT (user_id) target can never match. Same
  // fix as app/api/payments/verify/route.ts — see that file's comment for
  // the full explanation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingActive } = await (db.from('subscriptions') as any)
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  const subPayload = {
    plan,
    status: 'active',
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    amount_paise: amountPaise,
    expires_at: expiresAt,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = existingActive
    ? await (db.from('subscriptions') as any).update(subPayload).eq('id', existingActive.id)
    : await (db.from('subscriptions') as any).insert({ user_id: userId, ...subPayload })

  if (error) {
    console.error('[webhook] Subscription write failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[webhook] Subscription activated for user ${userId}, plan ${plan}, expires ${expiresAt}`)
  return NextResponse.json({ ok: true })
}
