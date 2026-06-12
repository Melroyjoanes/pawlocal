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

  // 2. Fetch provider by email (approved only) using admin client
  const admin = adminClient()
  const { data: provider } = await admin
    .from('providers')
    .select('*, provider_photos(url, is_primary)')
    .eq('email', user.email!)
    .eq('status', 'approved')
    .order('created_at', { ascending: true }).limit(1).maybeSingle()

  if (!provider) redirect('/pro')

  const typedProvider = provider as Provider & { provider_photos?: { url: string; is_primary: boolean }[] }

  // 3. Fetch analytics + broadcasts in parallel
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const categorySlugs: string[] =
    typedProvider.category_slugs?.length
      ? typedProvider.category_slugs
      : [typedProvider.category_slug]

  const [analyticsResult, broadcastsResult] = await Promise.all([
    admin
      .from('provider_analytics')
      .select('event_type, created_at')
      .eq('provider_id', provider.id),
    admin
      .from('broadcasts')
      .select('id, service_slug, pet_description, area, date_needed, budget, poster_name, poster_whatsapp')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .in('service_slug', categorySlugs)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const allEvents = (analyticsResult.data ?? []) as { event_type: string; created_at: string }[]
  const broadcasts = (broadcastsResult.data ?? []) as {
    id: string
    service_slug: string
    pet_description: string
    area: string
    date_needed: string
    budget: string | null
    poster_name: string
    poster_whatsapp: string
  }[]

  // 4. Compute stats
  const recentEvents = allEvents.filter(
    (e) => new Date(e.created_at) >= thirtyDaysAgo
  )
  const viewsThisMonth = recentEvents.filter((e) => e.event_type === 'view').length
  const whatsappTapsThisMonth = recentEvents.filter((e) => e.event_type === 'whatsapp_click').length
  const totalViews = allEvents.filter((e) => e.event_type === 'view').length

  const firstName = (provider.name as string).split(' ')[0]

  return (
    <ProDashboardClient
      provider={typedProvider}
      stats={{ viewsThisMonth, whatsappTapsThisMonth, totalViews }}
      broadcasts={broadcasts}
      firstName={firstName}
      providerName={provider.name as string}
    />
  )
}
