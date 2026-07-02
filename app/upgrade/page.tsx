import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import UpgradeClient from './UpgradeClient'

export const metadata = { title: 'Pricing — PupStep' }

export default async function UpgradePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()

  // Admin client for service-role queries (profiles table)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let currentPlan: 'monthly' | null = null
  let expiresAt: string | null = null

  if (user) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = (sub as any)?.plan ?? null
    currentPlan = plan === 'monthly' || plan === 'annual' ? 'monthly' : null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiresAt = (sub as any)?.expires_at ?? null
  }

  // Trial status
  const { data: trialProfile } = user
    ? await adminClient
        .from('profiles')
        .select('trial_started_at')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trialStartedAt: string | null = (trialProfile as any)?.trial_started_at ?? null
  const TRIAL_DAYS = 3
  let trialStatus: 'no_trial' | 'trial' | 'expired' | 'active' = 'no_trial'
  let trialDaysRemaining: number | null = null

  if (currentPlan) {
    trialStatus = 'active'
  } else if (trialStartedAt) {
    const msRemaining = new Date(trialStartedAt).getTime() + TRIAL_DAYS * 86400 * 1000 - Date.now()
    if (msRemaining > 0) {
      trialStatus = 'trial'
      trialDaysRemaining = Math.ceil(msRemaining / 86400000)
    } else {
      trialStatus = 'expired'
    }
  }

  // Walker connection — for the no_trial state CTA
  const { data: walkerConn } = user
    ? await supabase
        .from('walker_connections')
        .select('token, walker_name, walker_phone, dogs(name)')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walkerToken: string | null = (walkerConn as any)?.token ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walkerName: string | null = (walkerConn as any)?.walker_name ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walkerPhone: string | null = (walkerConn as any)?.walker_phone ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dogName: string | null = (walkerConn as any)?.dogs?.name ?? null

  return (
    <UpgradeClient
      currentPlan={currentPlan}
      expiresAt={expiresAt}
      isLoggedIn={!!user}
      trialStatus={trialStatus}
      trialDaysRemaining={trialDaysRemaining}
      walkerToken={walkerToken}
      walkerName={walkerName}
      walkerPhone={walkerPhone}
      dogName={dogName}
    />
  )
}
