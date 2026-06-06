/**
 * /dashboard — Auth-gated provider hub
 *
 * Signed in + linked provider     → redirect to their dashboard
 * Signed in + role = pet_owner    → redirect to /my-account
 * Signed in + no role set (new)   → show role picker
 * Signed in + role = provider     → show "find your listing"
 * Not signed in                   → proxy.ts redirects to /account
 */

import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import RolePicker from '@/components/RolePicker'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/account?reason=provider&next=/dashboard')
  }

  const meta = user.user_metadata ?? {}
  const userName: string = meta.full_name ?? meta.name ?? user.email ?? ''
  const userAvatar: string | null = meta.avatar_url ?? meta.picture ?? null

  // Check if they have a linked provider profile
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: provider } = await admin
    .from('providers')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  // Linked provider — go straight to their dashboard
  if (provider) {
    redirect(`/provider/${provider.id}/dashboard`)
  }

  // Role already picked as pet owner — send to my-account
  if (meta.pawlocal_role === 'pet_owner') {
    redirect('/my-account')
  }

  // Role already picked as provider but no profile linked yet
  if (meta.pawlocal_role === 'provider') {
    redirect('/my-listing')
  }

  // Brand new user — show role picker
  return <RolePicker userName={userName} userAvatar={userAvatar} />
}
