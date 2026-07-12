import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { sendGA4Event } from '@/lib/ga4'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = admin()

  // Get subscription before cancelling so we have expires_at for the email
  const { data: sub } = await adminClient
    .from('subscriptions')
    .select('expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
  }

  const { error } = await adminClient
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const cookieStore = await cookies()
  const gaCookie = cookieStore.get('_ga')?.value
  const gaParts = gaCookie?.split('.') ?? []
  const gaClientId = gaParts.length >= 4 ? `${gaParts[2]}.${gaParts[3]}` : user.id
  sendGA4Event(gaClientId, { name: 'subscription_cancelled' })

  const email = user.email
  const expiryDate = sub.expires_at
    ? new Date(sub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
    : 'your plan end date'

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && email) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'PupStep <hello@pupstep.in>',
        to: [email],
        subject: 'Your PupStep subscription has been cancelled',
        html: `<p>Hi,</p><p>Your PupStep subscription has been cancelled. Your access continues until <strong>${expiryDate}</strong>. You can resubscribe anytime at <a href="https://pupstep.in/upgrade">pupstep.in/upgrade</a>.</p><p>Thanks,<br/>The PupStep Team</p>`,
      }),
    })
  }

  return NextResponse.json({ ok: true })
}
