import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import UpgradeClient from './UpgradeClient'

export const metadata = { title: 'Upgrade to PupStep Pro' }

export default async function UpgradePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/upgrade')

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status, expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <UpgradeClient currentPlan={(sub as any)?.plan ?? null} expiresAt={(sub as any)?.expires_at ?? null} />
}
