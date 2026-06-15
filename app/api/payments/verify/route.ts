import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const PLAN_DAYS: Record<string, number> = { monthly: 30, annual: 365 }
const PLAN_PAISE: Record<string, number> = { monthly: 14900, annual: 99900 }

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json()

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

  // Upsert — if active subscription exists, extend it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin().from('subscriptions') as any)
    .upsert(
      {
        user_id: user.id,
        plan,
        status: 'active',
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount_paise: PLAN_PAISE[plan] ?? 14900,
        expires_at: expiresAt,
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, expires_at: expiresAt })
}
