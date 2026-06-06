import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProLoginClient from './ProLoginClient'

export default async function ProPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Check if they have an approved provider profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: provider } = await (supabase.from('providers') as any)
      .select('id')
      .eq('email', user.email)
      .eq('status', 'approved')
      .single()

    if (provider) {
      redirect('/pro/dashboard')
    }
  }

  return <ProLoginClient />
}
