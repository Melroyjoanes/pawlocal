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
  // Four user-facing states:
  //  - 'active'   currently entitled (Pro or in-trial-and-paid — see below)
  //  - 'trial'    currently inside the free trial window
  //  - 'lapsed'   not entitled now, but has had access before (trial ran out,
  //               OR a subscription was cancelled/expired) — "welcome back"
  //  - 'no_trial' genuinely never had any history — true first-time visitor
  let trialStatus: 'no_trial' | 'trial' | 'lapsed' | 'active' = 'no_trial'
  let trialDaysRemaining: number | null = null
  let hasEverPaid = false

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
    hasEverPaid = entitlement.hasEverPaid
    if (entitlement.isPro) {
      trialStatus = 'active'
    } else if (entitlement.trialActive) {
      trialStatus = 'trial'
    } else if (entitlement.hasHistory) {
      // Covers BOTH a trial that ran out AND a cancelled/expired subscription
      // — same "welcome back, resubscribe" treatment either way.
      trialStatus = 'lapsed'
    }

    // For the lapsed state, expiresAt from getEntitlement() only reflects a
    // currently-valid plan (null once the plan has actually expired). Look up
    // the most recent subscription's expiry (regardless of current validity)
    // so the "welcome back" copy can reference the date they lost access.
    if (trialStatus === 'lapsed' && !expiresAt) {
      const { data: lastSub } = await adminClient
        .from('subscriptions')
        .select('expires_at')
        .eq('user_id', user.id)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresAt = (lastSub as any)?.expires_at ?? null
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

  // Independent of walker-connection status — needed so the "Connect your
  // walker first" CTA (shown when there's no active connection) can link
  // straight to /setup/qr?dog=<id> instead of bouncing through /setup, which
  // only recovers this correctly when the visitor still has a live session.
  const { data: firstDog } = user
    ? await adminClient
        .from('dogs')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null }
  const firstDogId: string | null = (firstDog as { id: string } | null)?.id ?? null

  return (
    <UpgradeClient
      currentPlan={currentPlan}
      expiresAt={expiresAt}
      isLoggedIn={!!user}
      trialStatus={trialStatus}
      trialDaysRemaining={trialDaysRemaining}
      hasEverPaid={hasEverPaid}
      walkerToken={walkerToken}
      walkerName={walkerName}
      walkerPhone={walkerPhone}
      dogName={dogName}
      firstDogId={firstDogId}
    />
  )
}
