import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/payments/log-incident
// Called from the logged-in user's browser when the Razorpay verify call
// fails, so we don't lose the signal that money may have moved without a
// subscription being activated. Not a support ticket system — just a
// "don't lose the signal" endpoint. See app/api/cron/payment-reconciliation
// for the server-side sweep that catches the rest.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    kind?: string
    details?: object
    razorpay_order_id?: string
    razorpay_payment_id?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.kind || typeof body.kind !== 'string') {
    return NextResponse.json({ error: 'kind is required' }, { status: 400 })
  }

  const db = admin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('payment_incidents') as any)
    .insert({
      user_id: user.id,
      kind: body.kind,
      details: body.details ?? null,
      razorpay_order_id: body.razorpay_order_id ?? null,
      razorpay_payment_id: body.razorpay_payment_id ?? null,
    })

  if (error) {
    console.error('[log-incident] insert failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
