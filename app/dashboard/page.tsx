/**
 * /dashboard — Auth-gated provider hub
 *
 * If signed in + has a linked provider → redirect to their dashboard
 * If signed in + no provider found → show "not found" with help
 * If not signed in → middleware already redirected to /account
 */

import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/account?reason=provider&next=/dashboard')
  }

  // Find their provider profile
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: provider } = await admin
    .from('providers')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  if (provider) {
    redirect(`/provider/${provider.id}/dashboard`)
  }

  // Signed in but no provider linked yet
  const userMeta = user.user_metadata ?? {}
  const name = userMeta.full_name ?? userMeta.name ?? user.email ?? 'there'

  return (
    <div className="max-w-md mx-auto py-14 px-4">
      <div className="bg-white border border-border rounded-2xl p-8 text-center shadow-sm">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">No listing found</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          Hi {name}! Your Google account isn't linked to any PawLocal listing yet.
          If you registered, open the dashboard link we sent you on WhatsApp — you'll see a button to link this account.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/my-listing"
            className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-all"
            style={{
              background: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 100%)',
              color: '#451A03',
              boxShadow: '0 4px 0px rgba(120,53,15,0.28)',
            }}
          >
            Find my listing →
          </a>
          <a href="/join" className="block text-sm text-[var(--pl-teal)] font-medium hover:underline py-1">
            Not registered? List your service free
          </a>
        </div>
      </div>
    </div>
  )
}
