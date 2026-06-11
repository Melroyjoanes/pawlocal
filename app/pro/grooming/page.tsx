import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import GroomingReportClient from './GroomingReportClient'

type GroomingReport = {
  id: string
  token: string
  dog_name: string
  grooming_date: string
  duration_mins: number
  services_done: string[]
  ticks_found: number
  tick_locations: string[]
  skin_condition: string
  ear_condition: string
  nail_condition: string
  coat_condition: string
  behavior: string
  before_photo_url: string | null
  after_photo_url: string | null
  notes: string | null
  recommendations: string | null
  created_at: string
}

export default async function GroomingReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('id, name')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single()

  if (!provider) redirect('/pro')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reports } = await (admin.from('grooming_reports') as any)
    .select('id, token, dog_name, grooming_date, duration_mins, services_done, ticks_found, tick_locations, skin_condition, ear_condition, nail_condition, coat_condition, behavior, before_photo_url, after_photo_url, notes, recommendations, created_at')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <GroomingReportClient
      initialReports={(reports ?? []) as GroomingReport[]}
      providerId={provider.id}
      providerName={provider.name}
    />
  )
}
