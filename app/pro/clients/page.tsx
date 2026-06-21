import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProClientsClient from './ProClientsClient'

export default async function ProClientsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('id, name')
    .ilike('email', user.email!)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle()

  if (!provider) redirect('/pro')

  return (
    <ProClientsClient
      providerId={provider.id}
      providerName={provider.name}
    />
  )
}
