import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import UpgradeClient from './UpgradeClient'
import { getEntitlement } from '@/lib/entitlement'

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
  let trialStatus: 'no_trial' | 'trial' | 'expired' | 'active' = 'no_trial'
  let trialDaysRemaining: number | null = null

  if (user) {
    const entitlement = await getEntitlement(adminClient, user.id)

    expiresAt = entitlement.planExpiresAt

    // currentPlan only needs to distinguish "has a paid plan" from "doesn't" —
    // fetch the plan name separately since getEntitlement() doesn't expose it.
    if (entitlement.isPro) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .in('status', ['active', 'cancelled'])
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plan = (sub as any)?.plan ?? null
      currentPlan = plan === 'monthly' || plan === 'annual' ? 'monthly' : null
    }

    trialDaysRemaining = entitlement.trialDaysRemaining
    if (entitlement.isPro) {
      trialStatus = 'active'
    } else if (entitlement.trialActive) {
      trialStatus = 'trial'
    } else if (entitlement.trialExpired) {
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
