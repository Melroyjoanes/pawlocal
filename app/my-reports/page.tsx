import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import MyReportsClient from './MyReportsClient'
import { getEntitlement } from '@/lib/entitlement'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safe = async (q: any) => { try { return await q } catch { return { data: [] } } }

const REPORT_COLS = 'id, token, dog_name, duration_mins, poop_count, pee_count, distance_meters, walk_date, created_at, photo_url, notes, walker_name, logged_by'

export default async function MyReportsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth_required=1&next=/my-reports')

  const db = admin()

  // Get this parent's walker connections + dogs (both used for broad report lookup)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: connections }, { data: dogsRaw }] = await Promise.all([
    safe((db.from('walker_connections') as any)
      .select('id')
      .eq('owner_id', user.id)),
    safe((db.from('dogs') as any)
      .select('name')
      .eq('owner_id', user.id)),
  ])

  const connectionIds: string[] = (connections ?? []).map((c: { id: string }) => c.id)
  const dogNames: string[] = (dogsRaw ?? []).map((d: { name: string }) => d.name).filter(Boolean)

  const [
    entitlement,
    { data: subPlanRow },
    { data: ownerReports },       // via owner_id (migration 047)
    { data: claimedReports },     // via customer_id (old viral hook)
    { data: connectionReports },  // via connection_id (V2 primary)
    { data: dogNameReports },     // via dog_name fallback — catches old reports with null owner_id/connection_id
  ] = await Promise.all([
    getEntitlement(db, user.id),

    // Plan name only — getEntitlement() doesn't expose it, and the client
    // component wants it for display (e.g. "Monthly plan").
    safe((db.from('subscriptions') as any)
      .select('plan')
      .eq('user_id', user.id)
      .in('status', ['active', 'cancelled'])
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()),

    safe((db.from('walk_reports') as any)
      .select(REPORT_COLS)
      .eq('owner_id', user.id)
      .order('walk_date', { ascending: false })),

    safe((db.from('walk_reports') as any)
      .select(REPORT_COLS)
      .eq('customer_id', user.id)
      .order('walk_date', { ascending: false })),

    connectionIds.length > 0
      ? safe((db.from('walk_reports') as any)
          .select(REPORT_COLS)
          .in('connection_id', connectionIds)
          .order('walk_date', { ascending: false }))
      : { data: [] },

    // Fallback: match by dog name — catches pre-migration reports that have no owner_id/connection_id
    dogNames.length > 0
      ? safe((db.from('walk_reports') as any)
          .select(REPORT_COLS)
          .in('dog_name', dogNames)
          .order('walk_date', { ascending: false }))
      : { data: [] },
  ])

  // Merge all sources, dedupe by id
  const walkMap = new Map()
  const allReports = [
    ...(connectionReports ?? []),  // primary: V2 reports via connection_id
    ...(ownerReports ?? []),       // secondary: reports with owner_id set
    ...(dogNameReports ?? []),     // tertiary: fallback — old reports matched by dog name
    ...(claimedReports ?? []),     // quaternary: legacy claimed reports
  ]

  for (const r of allReports) {
    if (r && !walkMap.has(r.id)) {
      r.providers = r.walker_name ? { name: r.walker_name } : null
      walkMap.set(r.id, r)
    }
  }

  const isSubscribed = entitlement.isPro
  const trialExpired = entitlement.trialExpired

  return (
    <MyReportsClient
      walkReports={Array.from(walkMap.values())}
      isSubscribed={isSubscribed}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscriptionPlan={(subPlanRow as any)?.plan ?? null}
      userName={user.user_metadata?.full_name ?? user.email ?? ''}
      trialExpired={trialExpired}
      totalReports={Array.from(walkMap.values()).length}
    />
  )
}
