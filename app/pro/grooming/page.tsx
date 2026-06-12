import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import GroomingReportClient from './GroomingReportClient'

export default async function GroomingPage() {
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
    .order('created_at', { ascending: true }).limit(1).maybeSingle()

  if (!provider) redirect('/pro')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reports } = await (admin.from('grooming_reports') as any)
    .select('id, token, dog_name, grooming_date, duration_mins, services_done, ticks_found, tick_locations, skin_condition, ear_condition, nail_condition, coat_condition, behavior, before_photo_url, after_photo_url, notes, recommendations, created_at')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <GroomingReportClient
      initialReports={reports ?? []}
      providerId={provider.id as string}
      providerName={provider.name as string}
    />
  )
}
