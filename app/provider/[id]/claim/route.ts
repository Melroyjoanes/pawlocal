/**
 * GET /provider/[id]/claim
 *
 * Called after Google OAuth when a provider wants to link their Google account
 * to their PawLocal profile. The UUID in the URL IS the proof of ownership —
 * only someone who received the admin-sent dashboard link knows it.
 *
 * Flow:
 * 1. Provider opens their UUID dashboard link
 * 2. They click "Sign in with Google" on the claim banner
 * 3. OAuth redirects back to /auth/callback?next=/provider/[id]/claim
 * 4. This route verifies auth, links user_id, redirects to dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pawlocal.in'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()

  // Auth client (reads session from cookie)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Not signed in — redirect to dashboard (they'll see the claim banner again)
    return NextResponse.redirect(`${SITE}/provider/${id}/dashboard`)
  }

  // Service role client for the write operation
  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch the provider by UUID
  const { data: provider } = await admin
    .from('providers')
    .select('id, user_id, status, name')
    .eq('id', id)
    .single()

  if (!provider || provider.status !== 'approved') {
    return NextResponse.redirect(`${SITE}/?error=provider_not_found`)
  }

  // If already claimed by THIS user → just go to dashboard
  if (provider.user_id === user.id) {
    return NextResponse.redirect(`${SITE}/provider/${id}/dashboard`)
  }

  // If claimed by SOMEONE ELSE → block (shouldn't happen in practice)
  if (provider.user_id && provider.user_id !== user.id) {
    return NextResponse.redirect(
      `${SITE}/provider/${id}/dashboard?claim_error=already_claimed`
    )
  }

  // Check this Google account doesn't already own a different provider
  const { data: existing } = await admin
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing && existing.id !== id) {
    // Already own a different profile — redirect to theirs
    return NextResponse.redirect(`${SITE}/provider/${existing.id}/dashboard`)
  }

  // All good — link the account
  await admin
    .from('providers')
    .update({ user_id: user.id })
    .eq('id', id)

  // Redirect to dashboard with success flag
  return NextResponse.redirect(
    `${SITE}/provider/${id}/dashboard?claimed=1`
  )
}
