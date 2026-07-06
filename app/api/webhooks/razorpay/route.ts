// LEGACY / SAFETY-NET ROUTE — DO NOT re-add subscriptions writes here.
//
// This route used to try to reactivate/deactivate subscriptions by writing
// status: 'past_due' to the `subscriptions` table. That value has NEVER been
// valid: the table's CHECK constraint (supabase/migrations/032_subscriptions.sql)
// only allows 'active' | 'expired' | 'cancelled'. Every one of those writes was
// silently rejected by Postgres, and this route had no error handling on the
// `.update()` calls to notice.
//
// The current, correct webhook handler is app/api/payments/webhook/route.ts —
// it verifies the signature and does a manual check-then-write against
// subscriptions using only valid status values. The Razorpay Dashboard's
// webhook URL should be pointed at /api/payments/webhook.
//
// Until that's confirmed, we can't be 100% sure Razorpay isn't still
// configured to call this old URL. So this route now does the minimum safe
// thing: verify the signature (still correct, kept as-is), log every event it
// receives into payment_incidents (kind: 'legacy_webhook_hit') so a human can
// see in the data if this URL is still receiving real traffic, and return
// 200 OK. It no longer mutates `subscriptions` at all.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: 'PupStep <hello@pupstep.in>', to: [to], subject, html }),
    })
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('X-Razorpay-Signature') ?? ''

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')

  if (expectedSig !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody) as {
    event: string
    payload: {
      payment?: {
        entity: {
          id?: string
          order_id?: string
          notes: { user_id: string }
        }
      }
      subscription?: { entity: { notes: { user_id: string } } }
    }
  }

  const adminClient = admin()

  const userId =
    event.payload.payment?.entity.notes.user_id ?? event.payload.subscription?.entity.notes.user_id ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: incidentError } = await (adminClient.from('payment_incidents') as any).insert({
    user_id: userId,
    razorpay_order_id: event.payload.payment?.entity.order_id ?? null,
    razorpay_payment_id: event.payload.payment?.entity.id ?? null,
    kind: 'legacy_webhook_hit',
    details: { event: event.event, payload: event.payload },
  })

  if (incidentError) {
    console.error('[webhooks/razorpay] Failed to log legacy webhook incident:', incidentError.message)
  }

  if (event.event === 'payment.failed') {
    const failedUserId = event.payload.payment?.entity.notes.user_id
    if (failedUserId) {
      const { data: userData } = await adminClient.auth.admin.getUserById(failedUserId)
      const email = userData?.user?.email
      if (email) {
        await sendEmail(
          email,
          'Your PupStep payment failed',
          '<p>Hi,</p><p>Your PupStep payment failed. Please update your payment details at <a href="https://pupstep.in/upgrade">pupstep.in/upgrade</a> to avoid losing access.</p><p>Thanks,<br/>The PupStep Team</p>',
        )
      }
    }
  }

  return NextResponse.json({ status: 'ok' })
}
