import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// IST midnight as UTC
function todayMidnightIST(): string {
  const now = new Date()
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(now.getTime() + istOffset)
  const midnightIST = new Date(nowIST)
  midnightIST.setUTCHours(0, 0, 0, 0)
  // Convert back to UTC
  return new Date(midnightIST.getTime() - istOffset).toISOString()
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/?auth_required=1&next=/home')
  }

  const db = admin()
  const todayMidnight = todayMidnightIST()

  const [
    { data: profileData },
    { data: dogsRaw },
    { data: activeWalkRaw },
    { data: completedWalkRaw },
    { data: walkerConnectionsRaw },
    { data: lastWalkRaw },
    { data: subData },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('profiles') as any)
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('dogs') as any)
      .select('id, name, breed, photo_url, health_notes')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1),

    // Active walk session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_sessions') as any)
      .select('id, share_token, pet_name, started_at, provider_id, providers(name)')
      .eq('parent_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),

    // Completed walk today (IST)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_sessions') as any)
      .select('id, share_token, pet_name, started_at, ended_at, distance_meters, provider_id, providers(name)')
      .eq('parent_user_id', user.id)
      .eq('status', 'ended')
      .gte('started_at', todayMidnight)
      .order('started_at', { ascending: false })
      .limit(1),

    // Walker connections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walker_connections') as any)
      .select('id, walker_name, walker_phone, walker_role, status, dog_id, dogs(name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),

    // Most recent walk session (any status) for "last walked" display
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_sessions') as any)
      .select('id, started_at, ended_at, status')
      .eq('parent_user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(1),

    // Active subscription check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('subscriptions') as any)
      .select('plan, status, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle(),
  ])

  const userMeta = user.user_metadata ?? {}
  const displayName: string =
    (profileData as { full_name?: string } | null)?.full_name ??
    userMeta.full_name ??
    userMeta.name ??
    user.email?.split('@')[0] ??
    'there'

  const firstDog = dogsRaw?.[0] ?? null
  const activeWalk = activeWalkRaw ?? null
  const completedWalk = completedWalkRaw?.[0] ?? null
  const walkerConnections = walkerConnectionsRaw ?? []
  const lastWalk = lastWalkRaw?.[0] ?? null
  const isPro = !!subData

  return (
    <HomeClient
      displayName={displayName}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      firstDog={firstDog as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeWalk={activeWalk as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completedWalk={completedWalk as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walkerConnections={walkerConnections as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lastWalk={lastWalk as any}
      isPro={isPro}
    />
  )
}
