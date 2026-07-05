import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type RazorpayOrder = {
  id: string
  status: string
  amount: number
  created_at: number // unix seconds
  notes?: { user_id?: string; plan?: string }
}

// GET /api/cron/payment-reconciliation
// Detection-only sweep: compares Razorpay orders from the last 48 hours
// against our subscriptions table. If a paid order has no matching
// subscription row, we log a payment_incidents row for human review — we do
// NOT auto-create a subscription here, since that needs a human to confirm
// nothing else already handled it (client verify + webhook are the primary
// paths; this just catches the case where both silently failed).
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = adminClient()

  const credentials = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64')

  const ordersRes = await fetch('https://api.razorpay.com/v1/orders?count=100', {
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!ordersRes.ok) {
    console.error('[payment-reconciliation] Failed to fetch Razorpay orders:', await ordersRes.text())
    return NextResponse.json({ error: 'Could not fetch orders' }, { status: 500 })
  }

  const ordersData = await ordersRes.json() as { items?: RazorpayOrder[] }
  const allOrders = ordersData.items ?? []

  const cutoff = Date.now() - 48 * 3600 * 1000
  const recentPaidOrders = allOrders.filter(
    (o) => o.status === 'paid' && o.created_at * 1000 >= cutoff
  )

  let checked = 0
  let mismatches = 0

  for (const order of recentPaidOrders) {
    checked++

    const userId = order.notes?.user_id
    if (!userId) {
      // Can't attribute this order to a user — still worth flagging.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db.from('payment_incidents') as any).insert({
        user_id: null,
        razorpay_order_id: order.id,
        kind: 'reconciliation_mismatch',
        details: { reason: 'no_user_id_in_order_notes', order },
      })
      if (error) console.error('[payment-reconciliation] Failed to log incident:', error.message)
      mismatches++
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub, error: subError } = await (db.from('subscriptions') as any)
      .select('id, created_at')
      .eq('razorpay_order_id', order.id)
      .maybeSingle()

    if (subError) {
      console.error('[payment-reconciliation] Subscription lookup failed:', subError.message)
      continue
    }

    if (sub) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (db.from('payment_incidents') as any).insert({
      user_id: userId,
      razorpay_order_id: order.id,
      kind: 'reconciliation_mismatch',
      details: {
        reason: 'no_subscription_row_for_paid_order',
        plan: order.notes?.plan ?? null,
        amount_paise: order.amount,
        order_created_at: new Date(order.created_at * 1000).toISOString(),
      },
    })

    if (insertError) {
      console.error('[payment-reconciliation] Failed to log incident:', insertError.message)
      continue
    }

    mismatches++
  }

  return NextResponse.json({ ok: true, checked, mismatches })
}
