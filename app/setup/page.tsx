import { createClient } from '@/lib/supabase/server'
import SetupClient from './SetupClient'

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ just_paid?: string; recover?: string }>
}) {
  const { just_paid, recover } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // No redirect — show the form to everyone. Auth happens on submit.
  return (
    <SetupClient
      user={user ? {
        id: user.id,
        fullName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      } : null}
      justPaid={just_paid === '1'}
      recover={recover === '1'}
    />
  )
}
