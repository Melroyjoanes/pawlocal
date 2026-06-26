import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import MyReportsClient from './MyReportsClient'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safe = async (q: any) => { try { return await q } catch { return { data: [] } } }

export default async function MyReportsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth_required=1&next=/my-reports')

  const db = admin()

  const [
    { data: sub },
    { data: ownerReports },
    { data: claimedReports },
  ] = await Promise.all([
    safe(db.from('subscriptions' as any)
      .select('status, plan, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()),

    // QR-walker reports via owner_id (V2 primary — requires migration 047)
    // If column doesn't exist yet, safe() returns [] and we fall back to claimed reports
    safe((db.from('walk_reports') as any)
      .select('id, token, dog_name, duration_mins, poop_count, pee_count, distance_meters, walk_date, created_at, photo_url, notes, walker_name')
      .eq('owner_id', user.id)
      .order('walk_date', { ascending: false })),

    // Legacy claimed reports (parent clicked "Save to account" on old report)
    safe((db.from('walk_reports') as any)
      .select('id, token, dog_name, duration_mins, poop_count, pee_count, distance_meters, walk_date, created_at, photo_url, notes, walker_name')
      .eq('customer_id', user.id)
      .order('walk_date', { ascending: false })),
  ])

  // Merge and dedupe by id, normalise walker name
  const walkMap = new Map()
  for (const r of [...(ownerReports ?? []), ...(claimedReports ?? [])]) {
    if (r && !walkMap.has(r.id)) {
      // Attach providers shape MyReportsClient expects
      r.providers = r.walker_name ? { name: r.walker_name } : null
      walkMap.set(r.id, r)
    }
  }

  return (
    <MyReportsClient
      walkReports={Array.from(walkMap.values())}
      isSubscribed={true}
      subscriptionPlan={(sub as any)?.plan ?? null}
      userName={user.user_metadata?.full_name ?? user.email ?? ''}
    />
  )
}
