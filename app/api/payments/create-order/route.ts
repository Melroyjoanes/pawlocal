import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const PLANS = {
  monthly: { amount_paise: 19900, label: '₹199/month', days: 30 },
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json()
  if (!PLANS[plan as keyof typeof PLANS]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const { amount_paise } = PLANS[plan as keyof typeof PLANS]
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
  }

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

  const rzRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      amount: amount_paise,
      currency: 'INR',
      receipt: `sub_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: user.id, plan },
    }),
  })

  if (!rzRes.ok) {
    const err = await rzRes.text()
    return NextResponse.json({ error: `Razorpay error: ${err}` }, { status: 500 })
  }

  const order = await rzRes.json()
  return NextResponse.json({ order_id: order.id, amount: order.amount, key_id: keyId, plan })
}
