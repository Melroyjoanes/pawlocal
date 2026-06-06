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

  // Linked provider — route based on their approval status
  if (provider) {
    if (provider.status === 'approved') {
      redirect(`/provider/${provider.id}/dashboard`)
    }
    // Pending — show "under review" screen right here (no redirect to dashboard URL)
    const firstName = userName.split(' ')[0] || 'there'
    return (
      <div className="max-w-md mx-auto py-14 px-4 text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-5"
          style={{ background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)' }}
        >
          ⏳
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          You&apos;re in the queue, {firstName}!
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Your application is under review. We manually verify every listing — usually within 24 hours. You&apos;ll get an email the moment you&apos;re approved.
        </p>
        <div className="bg-white border border-border rounded-2xl p-5 text-left mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">What happens next</p>
          <div className="flex flex-col gap-3 text-sm text-foreground">
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs flex-shrink-0 font-bold">✓</span>
              <span>Application submitted — your Google account is linked</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-400 border border-border flex items-center justify-center text-xs flex-shrink-0">2</span>
              <span>Our team reviews your listing manually</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-400 border border-border flex items-center justify-center text-xs flex-shrink-0">3</span>
              <span>You get an email — then your dashboard is live</span>
            </div>
          </div>
        </div>
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to home
        </a>
      </div>
    )
  }

  // No provider linked — check role
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
