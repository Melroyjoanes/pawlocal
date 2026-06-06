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
  searchParams: Promise<{ reason?: string; next?: string }>
}) {
  const { reason, next } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Already signed in — send them to the right place
  if (user) {
    if (reason === 'provider' || next === '/dashboard') {
      redirect('/dashboard')
    }
    redirect('/my-account')
  }

  return <AccountClient reason={reason} next={next} />
}
