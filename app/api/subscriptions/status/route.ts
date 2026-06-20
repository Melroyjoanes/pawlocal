import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const TRIAL_DAYS = 14

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ status: 'no_trial', trial_started_at: null, trial_days_remaining: null, plan: null, expires_at: null })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscription } = await (admin().from('subscriptions') as any)
    .select('plan, status, expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (subscription) {
    return NextResponse.json({
      status: 'active',
      trial_started_at: null,
      trial_days_remaining: null,
      plan: subscription.plan,
      expires_at: subscription.expires_at,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin().from('profiles') as any)
    .select('trial_started_at')
    .eq('id', user.id)
    .single()

  const trialStartedAt: string | null = profile?.trial_started_at ?? null

  if (!trialStartedAt) {
    return NextResponse.json({
      status: 'no_trial',
      trial_started_at: null,
      trial_days_remaining: null,
      plan: null,
      expires_at: null,
    })
  }

  const trialEndMs = new Date(trialStartedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  const nowMs = Date.now()
  const msRemaining = trialEndMs - nowMs

  if (msRemaining > 0) {
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000))
    return NextResponse.json({
      status: 'trial',
      trial_started_at: trialStartedAt,
      trial_days_remaining: daysRemaining,
      plan: null,
      expires_at: null,
    })
  }

  return NextResponse.json({
    status: 'expired',
    trial_started_at: trialStartedAt,
    trial_days_remaining: null,
    plan: null,
    expires_at: null,
  })
}
