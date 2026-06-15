import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import MyReportsClient from './MyReportsClient'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export default async function MyReportsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/') // send to home, they'll see the claim prompt

  // Check subscription status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (admin().from('subscriptions') as any)
    .select('status, plan, expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  const isSubscribed = !!sub

  // Fetch all walk reports for this user (via claimed reports OR linked client)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: walkReports } = await (admin().from('walk_reports') as any)
    .select('id, token, dog_name, duration_mins, poop_count, pee_count, distance_meters, walk_date, created_at, photo_url, notes, provider_id, providers(name)')
    .eq('customer_id', user.id)
    .order('walk_date', { ascending: false })

  // Also fetch via provider_clients linkage (new system)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: linkedClients } = await (admin().from('provider_clients') as any)
    .select('id, pet_name')
    .eq('owner_user_id', user.id)

  const clientIds = (linkedClients ?? []).map((c: { id: string }) => c.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: linkedWalkReports } = clientIds.length > 0 ? await (admin().from('walk_reports') as any)
    .select('id, token, dog_name, duration_mins, poop_count, pee_count, distance_meters, walk_date, created_at, photo_url, notes, provider_id, providers(name)')
    .in('client_id', clientIds)
    .order('walk_date', { ascending: false }) : { data: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: linkedGroomingReports } = clientIds.length > 0 ? await (admin().from('grooming_reports') as any)
    .select('id, token, dog_name, grooming_date, services_done, ticks_found, after_photo_url, created_at, provider_id, providers(name)')
    .in('client_id', clientIds)
    .order('grooming_date', { ascending: false }) : { data: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: claimedGroomingReports } = await (admin().from('grooming_reports') as any)
    .select('id, token, dog_name, grooming_date, services_done, ticks_found, after_photo_url, created_at, provider_id, providers(name)')
    .eq('customer_id', user.id)
    .order('grooming_date', { ascending: false })

  // Merge and dedupe
  const walkMap = new Map()
  for (const r of [...(walkReports ?? []), ...(linkedWalkReports ?? [])]) walkMap.set(r.id, r)
  const groomMap = new Map()
  for (const r of [...(claimedGroomingReports ?? []), ...(linkedGroomingReports ?? [])]) groomMap.set(r.id, r)

  const allWalk = Array.from(walkMap.values())
  const allGroom = Array.from(groomMap.values())

  return (
    <MyReportsClient
      walkReports={allWalk}
      groomingReports={allGroom}
      isSubscribed={isSubscribed}
      subscriptionPlan={sub?.plan ?? null}
      userName={user.user_metadata?.full_name ?? user.email ?? ''}
    />
  )
}
