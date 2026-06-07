/**
 * /my-listing — Provider access page (server shell)
 * If already signed in with a linked provider → redirect straight to dashboard
 */

import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import MyListingClient from './MyListingClient'

export default async function MyListingPage() {
  // If already signed in + have a linked provider → redirect straight there
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: provider } = await admin
      .from('providers')
      .select('id')
      .eq('email', user.email)
      .single()

    if (provider) {
      redirect(`/pro/profile`)
    }
  }

  return <MyListingClient />
}
