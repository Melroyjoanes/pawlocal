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
      payment?: { entity: { notes: { user_id: string } } }
      subscription?: { entity: { notes: { user_id: string } } }
    }
  }

  const adminClient = admin()

  // Re-activate subscription when a past_due user pays again
  if (event.event === 'payment.captured') {
    const userId = event.payload.payment?.entity.notes.user_id
    if (userId) {
      await adminClient
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('user_id', userId)
        .eq('status', 'past_due')
    }
  }

  if (event.event === 'payment.failed') {
    const userId = event.payload.payment?.entity.notes.user_id
    if (userId) {
      await adminClient
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('user_id', userId)

      const { data: userData } = await adminClient.auth.admin.getUserById(userId)
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

  if (event.event === 'subscription.cancelled') {
    const userId = event.payload.subscription?.entity.notes.user_id
    if (userId) {
      await adminClient
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
    }
  }

  return NextResponse.json({ status: 'ok' })
}
