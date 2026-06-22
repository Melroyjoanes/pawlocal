import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Provider } from '@/lib/supabase/types'
import ProDashboardClient from './ProDashboardClient'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function ProDashboardPage() {
  // 1. Get signed-in user
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro')
  // Phone-auth users have no email — prevent null assertion crash + infinite redirect loop
  if (!user.email) redirect('/pro')

  // 2. Fetch provider by email (approved only) using admin client
  const admin = adminClient()
  const { data: provider } = await admin
    .from('providers')
    .select('*, provider_photos(url, is_primary)')
    .eq('email', user.email)
    .eq('status', 'approved')
    .order('created_at', { ascending: true }).limit(1).maybeSingle()

  if (!provider) redirect('/pro')

  const typedProvider = provider as Provider & { provider_photos?: { url: string; is_primary: boolean }[] }

  // 3. Fetch analytics — date-filtered at DB level to avoid unbounded row scan
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [analyticsRecentResult, totalViewsResult] = await Promise.all([
    admin
      .from('provider_analytics')
      .select('event_type')
      .eq('provider_id', provider.id)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    admin
      .from('provider_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', provider.id)
      .eq('event_type', 'view'),
  ])

  const recentEvents = (analyticsRecentResult.data ?? []) as { event_type: string }[]

  // 4. Compute stats
  const viewsThisMonth = recentEvents.filter((e) => e.event_type === 'view').length
  const whatsappTapsThisMonth = recentEvents.filter((e) => e.event_type === 'whatsapp_click').length
  const totalViews = totalViewsResult.count ?? 0

  const firstName = (provider.name as string).split(' ')[0]

  return (
    <ProDashboardClient
      provider={typedProvider}
      stats={{ viewsThisMonth, whatsappTapsThisMonth, totalViews }}
      firstName={firstName}
      providerName={provider.name as string}
    />
  )
}
