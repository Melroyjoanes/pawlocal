import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { ProviderWithPhotos, ProviderPhoto } from '@/lib/supabase/types'
import ProProfileClient from './ProProfileClient'

export default async function ProProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('*')
    .eq('email', user.email)
    .eq('status', 'approved')
    .order('created_at', { ascending: true }).limit(1).maybeSingle()

  if (!provider) redirect('/pro')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: photos } = await (admin.from('provider_photos') as any)
    .select('*')
    .eq('provider_id', provider.id)
    .order('sort_order', { ascending: true })

  const providerWithPhotos: ProviderWithPhotos = {
    ...(provider as ProviderWithPhotos),
    provider_photos: (photos ?? []) as ProviderPhoto[],
  }

  return <ProProfileClient provider={providerWithPhotos} />
}
