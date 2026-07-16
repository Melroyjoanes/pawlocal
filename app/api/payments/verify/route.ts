import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { sendGA4Event } from '@/lib/ga4'
import { sendEmail, proWelcomeEmail } from '@/lib/email'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const PLAN_DAYS: Record<string, number> = { monthly: 30 }
const PLAN_PAISE: Record<string, number> = { monthly: 19900 }

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, ga_client_id } = await req.json()

  // Verify HMAC signature
  const keySecret = process.env.RAZORPAY_KEY_SECRET!
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  const db = admin()

  // Payment replay guard: if this exact razorpay_payment_id has already been
  // used to grant access (by any user, not just this one), don't write again
  // or extend anything further. Makes duplicate/retry calls idempotent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: alreadyProcessed } = await (db.from('subscriptions') as any)
    .select('expires_at')
    .eq('razorpay_payment_id', razorpay_payment_id)
    .maybeSingle()

  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, alreadyProcessed: true, expires_at: alreadyProcessed.expires_at })
  }

  // Re-fetch the order from Razorpay's API server-side rather than trusting
  // the client-supplied `plan` field — the client's `plan` param is advisory
  // only from here on. Same fetch pattern as app/api/payments/webhook/route.ts.
  const credentials = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64')

  const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!orderRes.ok) {
    console.error('[verify] Failed to fetch Razorpay order:', await orderRes.text())
    return NextResponse.json({ error: 'Could not fetch order' }, { status: 500 })
  }

  const order = await orderRes.json() as {
    status?: string
    amount?: number
    notes?: { user_id?: string; plan?: string }
  }

  if (order.status !== 'paid') {
    return NextResponse.json({ error: 'Order is not paid' }, { status: 400 })
  }

  if (order.notes?.user_id !== user.id) {
    return NextResponse.json({ error: 'Order does not belong to this user' }, { status: 400 })
  }

  const verifiedPlan = order.notes?.plan ?? 'monthly'
  const verifiedAmountPaise = order.amount ?? (PLAN_PAISE[verifiedPlan] ?? 19900)

  const days = PLAN_DAYS[verifiedPlan] ?? 30
  const expiresAt = new Date(Date.now() + days * 86400 * 1000).toISOString()

  // Extend the existing active row if one exists, else insert a new one.
  // NOT a Supabase upsert(onConflict: 'user_id') — the only unique index on
  // subscriptions.user_id is PARTIAL (WHERE status = 'active', see migration
  // 032), which a plain ON CONFLICT (user_id) target can never match. That
  // mismatch made every real payment fail here with "no unique or exclusion
  // constraint matching the ON CONFLICT specification" — the customer's card
  // was charged but the subscription never activated. This manual
  // check-then-write matches the same pattern already used in
  // app/api/admin/v2/parents/[userId]/action/route.ts's grant logic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingActive } = await (db.from('subscriptions') as any)
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const subPayload = {
    plan: verifiedPlan,
    status: 'active',
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount_paise: verifiedAmountPaise,
    expires_at: expiresAt,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = existingActive
    ? await (db.from('subscriptions') as any).update(subPayload).eq('id', existingActive.id)
    : await (db.from('subscriptions') as any).insert({ user_id: user.id, ...subPayload })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Server-side purchase event — the source of truth for revenue reporting.
  // Fired here (not just client-side) so a closed tab or network blip between
  // "payment succeeded" and the browser sending its own beacon never loses
  // the conversion. Uses the browser's real GA4 client_id when available so
  // it merges into that visitor's session instead of showing up disconnected.
  sendGA4Event(ga_client_id || user.id, {
    name: 'purchase',
    params: {
      currency: 'INR',
      value: verifiedAmountPaise / 100,
      transaction_id: razorpay_payment_id,
      plan: verifiedPlan,
    },
  })

  // Welcome / renewal email — via after() so it survives on Vercel (a bare
  // fire-and-forget block gets frozen when the response returns; see
  // walk-logs route for the same fix and the NULL email_sent_at evidence).
  after(async () => {
    const email = user.email
    if (!email) return
    const planLabel = '₹199/month'
    const expiryLabel = new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
    await sendEmail({
      to: email,
      subject: existingActive ? 'Your PupStep Pro plan has renewed 🐾' : "You're a Pro member now 🎉",
      html: proWelcomeEmail({ planLabel, expiryLabel, isRenewal: !!existingActive }),
    })
  })

  return NextResponse.json({ ok: true, expires_at: expiresAt })
}
