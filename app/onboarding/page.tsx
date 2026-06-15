import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const userName = user.user_metadata?.full_name?.split(' ')[0] ?? 'there'

  return <OnboardingClient userName={userName} />
}
