import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import WalkReportClient from './WalkReportClient'

type WalkReport = {
  id: string
  token: string
  dog_name: string
  duration_mins: number
  poop_count: number
  pee_count: number
  notes: string | null
  photo_url: string | null
  walk_date: string
  created_at: string
}

export default async function WalkReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/pro')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('id, name, verification_tier')
    .eq('email', user.email)
    .eq('status', 'approved')
    .single()

  if (!provider) redirect('/pro')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reports } = await (admin.from('walk_reports') as any)
    .select('id, token, dog_name, duration_mins, poop_count, pee_count, notes, photo_url, walk_date, created_at')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })

  return (
    <WalkReportClient
      initialReports={(reports as WalkReport[]) ?? []}
      providerId={provider.id as string}
      providerName={provider.name as string}
      verificationTier={(provider.verification_tier as string) ?? null}
    />
  )
}
