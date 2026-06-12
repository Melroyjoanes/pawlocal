import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProLeadsClient from './ProLeadsClient'

type Broadcast = {
  id: string
  service_slug: string
  pet_description: string
  area: string
  date_needed: string
  budget: string | null
  poster_name: string
  poster_whatsapp: string
  notes: string | null
  status: 'active' | 'filled' | 'expired'
  created_at: string
  expires_at: string
}

export default async function ProLeadsPage() {
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
    .select('id, name, category_slug, category_slugs')
    .eq('email', user.email)
    .eq('status', 'approved')
    .order('created_at', { ascending: true }).limit(1).maybeSingle()

  if (!provider) redirect('/pro')

  const categorySlugs: string[] =
    Array.isArray(provider.category_slugs) && provider.category_slugs.length > 0
      ? provider.category_slugs
      : [provider.category_slug]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: broadcasts } = await (admin.from('broadcasts') as any)
    .select(
      'id, service_slug, pet_description, area, date_needed, budget, poster_name, poster_whatsapp, notes, status, created_at, expires_at'
    )
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .in('service_slug', categorySlugs)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <ProLeadsClient
      broadcasts={(broadcasts as Broadcast[]) ?? []}
      providerName={provider.name as string}
      providerCategories={categorySlugs}
    />
  )
}
