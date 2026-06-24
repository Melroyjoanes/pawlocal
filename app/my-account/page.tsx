import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import MyAccountClient from './MyAccountClient'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function MyAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware handles redirect for unauthenticated users, but double-check here
  if (!user) {
    redirect('/?auth_required=1&next=/my-account')
  }

  // Derive phone for lookup — strip country code
  const rawPhone = user.phone ?? ''
  const normalizedPhone = rawPhone.replace(/\D/g, '').replace(/^91/, '')

  // Fetch broadcasts by user_id (works for all auth providers incl. Google — migration 017 added user_id column)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: broadcastsData } = await (admin().from('broadcasts') as any)
    .select('id, service_slug, pet_description, area, date_needed, budget, poster_name, status, created_at, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const broadcasts: {
    id: string; service_slug: string; pet_description: string;
    area: string; date_needed: string; budget: string | null;
    poster_name: string | null; status: string; created_at: string; expires_at: string | null;
  }[] = broadcastsData ?? []

  // Fetch claimed walk reports, grooming reports, informal walk logs, subscription, profile, dogs, and walker connections in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: claimedReports }, { data: claimedGroomingReports }, { data: walkLogsRaw }, { data: subData }, { data: profileData }, { data: dogsRaw }, { data: walkerConnectionsRaw }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin().from('walk_reports') as any)
      .select('id, token, dog_name, walk_date, duration_mins, poop_count, pee_count, distance_meters, photo_url, providers(name, is_verified)')
      .eq('customer_id', user.id)
      .order('walk_date', { ascending: false })
      .limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin().from('grooming_reports') as any)
      .select('id, token, dog_name, grooming_date, duration_mins, services_done, ticks_found, skin_condition, coat_condition, before_photo_url, after_photo_url, providers(name, is_verified)')
      .eq('customer_id', user.id)
      .order('grooming_date', { ascending: false })
      .limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin().from('walk_logs') as any)
      .select('id, dog_id, walker_name, started_at, duration_mins, distance_km, poop_count, pee_count, mood, photo_url, notes, created_at, dogs(name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin().from('subscriptions') as any)
      .select('plan, status, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin().from('profiles') as any)
      .select('trial_started_at, phone, notification_preferences')
      .eq('id', user.id)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin().from('dogs') as any)
      .select('id, name, breed, photo_url, health_notes, care_focus, walking_instructions')
      .eq('owner_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin().from('walker_connections') as any)
      .select('id, dog_id, walker_name, walker_phone, walker_role, status, claimed_at, connection_token, dogs(name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const trialStartedAt = (profileData as any)?.trial_started_at ?? null
  const profilePhone: string | null = (profileData as any)?.phone ?? null
  const notificationPreferences: { report_email?: boolean; weekly_summary?: boolean } = (profileData as any)?.notification_preferences ?? {}
  const activeSub = subData ?? null
  let subStatus: { status: 'trial' | 'active' | 'expired' | 'no_trial'; trial_days_remaining: number | null; expires_at: string | null }

  if (activeSub) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subStatus = { status: 'active', trial_days_remaining: null, expires_at: (activeSub as any).expires_at }
  } else if (!trialStartedAt) {
    subStatus = { status: 'no_trial', trial_days_remaining: null, expires_at: null }
  } else {
    const trialEndMs = new Date(trialStartedAt).getTime() + 14 * 24 * 60 * 60 * 1000
    const msLeft = trialEndMs - Date.now()
    if (msLeft > 0) {
      subStatus = { status: 'trial', trial_days_remaining: Math.ceil(msLeft / 86400000), expires_at: new Date(trialEndMs).toISOString() }
    } else {
      subStatus = { status: 'expired', trial_days_remaining: 0, expires_at: new Date(trialEndMs).toISOString() }
    }
  }

  const userMeta = user.user_metadata ?? {}
  const userDisplay =
    userMeta.full_name ??
    userMeta.name ??
    (normalizedPhone.length >= 10 ? `+91 ${normalizedPhone}` : user.email ?? 'Your account')

  const userAvatar: string | null = userMeta.avatar_url ?? userMeta.picture ?? null
  const userEmail: string | null = user.email ?? null

  return (
    <MyAccountClient
      broadcasts={broadcasts}
      claimedReports={claimedReports ?? []}
      claimedGroomingReports={claimedGroomingReports ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walkLogs={(walkLogsRaw ?? []) as any}
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
    />
  )
}
