import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProReportsPage from './ProReportsPage'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('id, name, verification_tier, category_slug, category_slugs')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single()

  if (!provider) redirect('/pro')

  // Fetch walk reports and grooming reports in parallel
  const [walkResult, groomingResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from('walk_reports') as any)
      .select('id, token, dog_name, duration_mins, poop_count, pee_count, notes, photo_url, walk_date, created_at, start_location, end_location')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })
      .limit(50),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from('grooming_reports') as any)
      .select('id, token, dog_name, grooming_date, duration_mins, services_done, ticks_found, tick_locations, skin_condition, ear_condition, nail_condition, coat_condition, behavior, before_photo_url, after_photo_url, notes, recommendations, created_at')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // A provider can create grooming reports if their category_slug is 'grooming'
  // or if 'grooming' is in their category_slugs array
  const categorySlugs: string[] = (provider.category_slugs as string[]) ?? []
  const isGroomer =
    provider.category_slug === 'grooming' || categorySlugs.includes('grooming')

  return (
    <ProReportsPage
      walkReports={walkResult.data ?? []}
      groomingReports={groomingResult.data ?? []}
      providerId={provider.id as string}
      providerName={provider.name as string}
      verificationTier={(provider.verification_tier as string) ?? null}
      isGroomer={isGroomer}
    />
  )
}
