import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProBookingsClient from './ProBookingsClient'

export default async function ProBookingsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('id, name, category_slug, category_slugs')
    .eq('email', user.email!)
    .eq('status', 'approved')
    .limit(1).maybeSingle()

  if (!provider) redirect('/pro')

  const firstName = (provider.name as string).split(' ')[0]
  const categorySlugs: string[] = provider.category_slugs?.length
    ? provider.category_slugs
    : [provider.category_slug]

  return (
    <ProBookingsClient
      providerId={provider.id}
      firstName={firstName}
      categorySlugs={categorySlugs}
    />
  )
}
