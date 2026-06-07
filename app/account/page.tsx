/**
 * /account — Entry point for both pet owners and providers
 * Shows sign-in options + role selection
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import AccountClient from './AccountClient'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; next?: string }>
}) {
  const { reason, next } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    // Check if this signed-in user is an approved provider
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: provider } = await (admin.from('providers') as any)
      .select('id, status')
      .eq('email', user.email)
      .single()

    if (provider?.status === 'approved') {
      // Providers always go to their dashboard — they cannot use the customer account page
      redirect('/pro/dashboard')
    }

    if (provider?.status === 'pending') {
      // Applied but not yet approved — send to pro login with pending notice
      redirect('/pro?status=pending')
    }

    // Non-provider signed in — send them to the right place
    // Respect `next` if it's a safe customer URL (not /pro or /admin)
    if (next && !next.startsWith('/pro') && !next.startsWith('/admin') && next !== '/my-account') {
      redirect(next)
    }
    if (reason === 'provider' || next === '/dashboard') {
      redirect('/dashboard')
    }
    redirect('/my-account')
  }

  return <AccountClient reason={reason} next={next} />
}
