import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProLoginClient from './ProLoginClient'

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    // Use admin client — providers table SELECT policy may not cover all cases
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: provider } = await (admin.from('providers') as any)
      .select('id, status')
      .eq('email', user.email)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()

    if (provider?.status === 'approved') {
      redirect('/pro/reports')
    }

    if (provider?.status === 'pending') {
      // Don't loop if already on the pending banner page
      if (status !== 'pending') redirect('/pro?status=pending')
      // Fall through — ProLoginClient shows the pending banner
    } else if (!provider) {
      // Signed-in customer with no provider record — send them home
      redirect('/my-account')
    }
  }

  return <ProLoginClient />
}
