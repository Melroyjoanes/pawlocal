import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SetupClient from './SetupClient'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/account?next=/setup')
  }

  const fullName: string | null =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null

  return <SetupClient userName={fullName} />
}
