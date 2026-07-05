import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { sendGA4Event } from '@/lib/ga4'

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

  const days = PLAN_DAYS[plan] ?? 30
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
  const db = admin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingActive } = await (db.from('subscriptions') as any)
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const subPayload = {
    plan,
    status: 'active',
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount_paise: PLAN_PAISE[plan] ?? 19900,
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
      value: (PLAN_PAISE[plan] ?? 19900) / 100,
      transaction_id: razorpay_payment_id,
      plan,
    },
  })

  // Fire-and-forget welcome / renewal email
  ;(async () => {
    const email = user.email
    if (!email || !process.env.RESEND_API_KEY) return
    const planLabel = '₹199/month'
    const expiryLabel = new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'PupStep <hello@pupstep.in>',
        to: [email],
        subject: 'Welcome to PupStep Pro 🐾',
        html: `<p>Hi!</p><p>You're now on PupStep Pro (${planLabel}). Your access runs until <strong>${expiryLabel}</strong>.</p><p>Enjoy unlimited walk reports, GPS tracking, and the full care diary. <a href="https://pupstep.in/home">Go to your dashboard →</a></p><p>Thanks,<br/>The PupStep Team</p>`,
      }),
    }).catch(() => {})
  })()

  return NextResponse.json({ ok: true, expires_at: expiresAt })
}
