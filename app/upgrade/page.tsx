import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
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

  return <UpgradeClient currentPlan={currentPlan} expiresAt={expiresAt} isLoggedIn={!!user} />
}
