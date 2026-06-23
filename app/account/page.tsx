/**
 * /account — Entry point for both pet owners and providers
 * Shows sign-in options + role selection
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AccountClient from './AccountClient'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Already signed in — send to the intended destination or /home
    if (next && !next.startsWith('/pro') && !next.startsWith('/admin')) {
      redirect(next)
    }
    redirect('/home')
  }

  return <AccountClient next={next} />
}
