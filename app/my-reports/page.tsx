import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import MyReportsClient from './MyReportsClient'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safe = async (q: any) => { try { return await q } catch { return { data: [] } } }

const REPORT_COLS = 'id, token, dog_name, duration_mins, poop_count, pee_count, distance_meters, walk_date, created_at, photo_url, notes, walker_name'

export default async function MyReportsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth_required=1&next=/my-reports')

  const db = admin()

  // Get this parent's walker connections first (always works, no migration needed)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: connections } = await safe((db.from('walker_connections') as any)
    .select('id')
    .eq('owner_id', user.id))

  const connectionIds: string[] = (connections ?? []).map((c: { id: string }) => c.id)

  const [
    { data: sub },
    { data: ownerReports },    // via owner_id (needs migration 047)
    { data: claimedReports },  // via customer_id (claimed via viral hook)
    { data: connectionReports }, // via connection_id (always works — V2 primary)
  ] = await Promise.all([
    safe(db.from('subscriptions' as any)
      .select('status, plan, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()),

    // Via owner_id — works after migration 047
    safe((db.from('walk_reports') as any)
      .select(REPORT_COLS)
      .eq('owner_id', user.id)
      .order('walk_date', { ascending: false })),

    // Via customer_id — reports the parent claimed via "Save to account"
    safe((db.from('walk_reports') as any)
      .select(REPORT_COLS)
      .eq('customer_id', user.id)
      .order('walk_date', { ascending: false })),

    // Via connection_id — V2 QR walker reports, ALWAYS works regardless of migrations
    connectionIds.length > 0
      ? safe((db.from('walk_reports') as any)
          .select(REPORT_COLS)
          .in('connection_id', connectionIds)
          .order('walk_date', { ascending: false }))
      : { data: [] },
  ])

  // Merge all three sources, dedupe by id
  const walkMap = new Map()
  const allReports = [
    ...(connectionReports ?? []),  // primary: V2 reports via connection
    ...(ownerReports ?? []),       // secondary: after migration 047
    ...(claimedReports ?? []),     // tertiary: claimed reports
  ]

  for (const r of allReports) {
    if (r && !walkMap.has(r.id)) {
      r.providers = r.walker_name ? { name: r.walker_name } : null
      walkMap.set(r.id, r)
    }
  }

  const isSubscribed = !!(sub as { status?: string } | null)?.status

  // Fetch trial status
  const { data: trialProfile } = await safe((db.from('profiles') as any)
    .select('trial_started_at')
    .eq('id', user.id)
    .maybeSingle())

  const trialStartedAt: string | null = (trialProfile as any)?.trial_started_at ?? null
  const TRIAL_DAYS = 3
  let trialExpired = false
  if (!isSubscribed && trialStartedAt) {
    const msRemaining = new Date(trialStartedAt).getTime() + TRIAL_DAYS * 86400 * 1000 - Date.now()
    trialExpired = msRemaining <= 0
  }

  return (
    <MyReportsClient
      walkReports={Array.from(walkMap.values())}
      isSubscribed={isSubscribed}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscriptionPlan={(sub as any)?.plan ?? null}
      userName={user.user_metadata?.full_name ?? user.email ?? ''}
      trialExpired={trialExpired}
      totalReports={Array.from(walkMap.values()).length}
    />
  )
}
