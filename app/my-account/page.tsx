import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getEntitlement } from '@/lib/entitlement'
import MyAccountClient from './MyAccountClient'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safe = async (q: any) => { try { return await q } catch { return { data: null, count: null } } }

export default async function MyAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/?auth_required=1&next=/my-account')
  }

  const db = admin()

  const [
    { data: subData },
    { data: profileData },
    { data: dogsRaw },
    { data: walkerConnectionsRaw },
    entitlement,
  ] = await Promise.all([
    safe((db.from('subscriptions') as any)
      .select('plan, status, expires_at')
      .eq('user_id', user.id)
      .in('status', ['active', 'cancelled'])
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()),
    safe((db.from('profiles') as any)
      .select('trial_started_at, phone, notification_preferences')
      .eq('id', user.id)
      .maybeSingle()),
    safe((db.from('dogs') as any)
      .select('id, name, breed, photo_url, health_notes, care_focus')
      .eq('owner_id', user.id)),
    safe((db.from('walker_connections') as any)
      .select('id, dog_id, walker_name, walker_phone, walker_role, status, claimed_at, token, dogs(name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })),
    getEntitlement(db, user.id),
  ])

  const trialStartedAt = (profileData as any)?.trial_started_at ?? null
  const profilePhone: string | null = (profileData as any)?.phone ?? null
  const notificationPreferences: { report_email?: boolean; weekly_summary?: boolean } = (profileData as any)?.notification_preferences ?? {}
  const activeSub = subData ?? null

  let subStatus: { status: 'trial' | 'active' | 'cancelled' | 'expired' | 'no_trial'; trial_days_remaining: number | null; expires_at: string | null }

  if (activeSub) {
    const realStatus = (activeSub as any).status === 'cancelled' ? 'cancelled' : 'active'
    subStatus = { status: realStatus, trial_days_remaining: null, expires_at: (activeSub as any).expires_at }
  } else if (!trialStartedAt) {
    subStatus = { status: 'no_trial', trial_days_remaining: null, expires_at: null }
  } else {
    const trialEndMs = new Date(trialStartedAt).getTime() + 3 * 24 * 60 * 60 * 1000
    const msLeft = trialEndMs - Date.now()
    if (msLeft > 0) {
      subStatus = { status: 'trial', trial_days_remaining: Math.ceil(msLeft / 86400000), expires_at: new Date(trialEndMs).toISOString() }
    } else {
      subStatus = { status: 'expired', trial_days_remaining: 0, expires_at: new Date(trialEndMs).toISOString() }
    }
  }

  const userMeta = user.user_metadata ?? {}
  const userDisplay =
    userMeta.full_name ?? userMeta.name ?? user.email ?? 'Your account'
  const userAvatar: string | null = userMeta.avatar_url ?? userMeta.picture ?? null
  const userEmail: string | null = user.email ?? null

  return (
    <MyAccountClient
      broadcasts={[]}
      claimedReports={[]}
      claimedGroomingReports={[]}
      walkLogs={[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dogs={(dogsRaw ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walkerConnections={(walkerConnectionsRaw ?? []) as any}
      userDisplay={userDisplay}
      userAvatar={userAvatar}
      userEmail={userEmail}
      userId={user.id}
      subStatus={subStatus}
      profilePhone={profilePhone}
      notificationPreferences={notificationPreferences}
      isEntitled={entitlement.isEntitled}
      hasEverPaid={entitlement.hasEverPaid}
    />
  )
}
