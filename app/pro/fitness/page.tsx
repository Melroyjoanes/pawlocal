import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProFitnessClient from './ProFitnessClient'

export default async function ProFitnessPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('id, name, category_slug')
    .eq('email', user.email!)
    .eq('status', 'approved')
    .single()

  if (!provider) redirect('/pro')

  return (
    <ProFitnessClient
      providerId={provider.id}
      firstName={(provider.name as string).split(' ')[0]}
    />
  )
}
