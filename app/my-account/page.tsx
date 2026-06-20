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

interface SavedProvider {
  id: string
  name: string
  category_slug: string
  whatsapp: string
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

  // Fetch broadcasts — by user_id first (works after migration 017), then fall back to phone
  let broadcasts: {
    id: string; service_slug: string; pet_description: string;
    area: string; date_needed: string; budget: string | null;
    status: string; created_at: string;
  }[] = []

  // Try by user_id first (works after migration 017 when user_id is set on broadcasts)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: broadcastsByUser } = await (supabase.from('broadcasts') as any)
    .select('id, service_slug, pet_description, area, date_needed, budget, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (broadcastsByUser && broadcastsByUser.length > 0) {
    broadcasts = broadcastsByUser
  } else if (normalizedPhone.length >= 10) {
    // Fallback: match by phone for older broadcasts
    const { data } = await supabase
      .from('broadcasts')
      .select('id, service_slug, pet_description, area, date_needed, budget, status, created_at')
      .ilike('poster_whatsapp', `%${normalizedPhone}%`)
      .order('created_at', { ascending: false })
    broadcasts = data ?? []
  }

  // Fetch reviews
  let reviews: {
    id: string; provider_id: string; rating: number; comment: string | null;
    created_at: string; providers?: { name: string };
  }[] = []

  if (normalizedPhone.length >= 10) {
    const { data } = await supabase
      .from('reviews')
      .select('id, provider_id, rating, comment, created_at, providers(name)')
      .ilike('reviewer_phone', `%${normalizedPhone}%`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    // Cast because Supabase returns nested as array for joined tables
    reviews = (data ?? []) as unknown as typeof reviews
  }

  // Fetch booking requests
  const { data: bookingRequestsRaw } = await supabase
    .from('booking_requests')
    .select('*, providers(name, category_slug)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  const bookingRequests: {
    id: string; provider_id: string; service_slug: string; pet_name: string;
    pet_type: string; date_needed: string; time_needed: string; notes: string | null;
    status: string; created_at: string; providers?: { name: string; category_slug: string };
  }[] = (bookingRequestsRaw ?? []) as unknown as typeof bookingRequests

  // Fetch claimed walk reports, grooming reports, informal walk logs, subscription, and profile in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: claimedReports }, { data: claimedGroomingReports }, { data: walkLogsRaw }, { data: subData }, { data: profileData }] = await Promise.all([
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
      .select('trial_started_at')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const trialStartedAt = (profileData as any)?.trial_started_at ?? null
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

  // Saved providers come from localStorage — server can't read it, so pass empty array
  // MyAccountClient will hydrate from localStorage on mount
  const savedProviders: SavedProvider[] = []

  const userMeta = user.user_metadata ?? {}
  const userDisplay =
    userMeta.full_name ??
    userMeta.name ??
    (normalizedPhone.length >= 10 ? `+91 ${normalizedPhone}` : user.email ?? 'Your account')

  const userAvatar: string | null = userMeta.avatar_url ?? userMeta.picture ?? null

  return (
    <MyAccountClient
      broadcasts={broadcasts}
      reviews={reviews}
      savedProviders={savedProviders}
      bookingRequests={bookingRequests}
      claimedReports={claimedReports ?? []}
      claimedGroomingReports={claimedGroomingReports ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walkLogs={(walkLogsRaw ?? []) as any}
      userDisplay={userDisplay}
      userAvatar={userAvatar}
      userId={user.id}
      subStatus={subStatus}
    />
  )
}
