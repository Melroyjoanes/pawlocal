import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function resolveBase(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) return `https://${forwardedHost}`
  if (process.env.NODE_ENV === 'development') return new URL(request.url).origin
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
}

// Extract invite token if the next path is the provider link route
function extractInviteToken(next: string): string | null {
  const match = next.match(/^\/join-as-provider\/([^/]+)\/link/)
  return match ? match[1] : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAnalyticsEvent(admin: any, params: {
  event_type: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  is_new_user: boolean
  invite_token: string | null
  referrer_url: string | null
  ip_address: string | null
  user_agent: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await (admin.from('analytics_events') as any).insert({
      ...params,
      metadata: params.metadata ?? {},
    })
  } catch {
    // never fail auth flow due to analytics
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const base = resolveBase(request)

  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') && !rawNext.includes('://') && !rawNext.startsWith('//') ? rawNext : '/'

  if (!code) {
    return NextResponse.redirect(`${base}/?auth_error=true`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${base}/?auth_error=true`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${base}/?auth_error=true`)

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Determine if new user: created_at and last_sign_in_at within 10 seconds of each other
  const createdAt = new Date(user.created_at).getTime()
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt
  const isNewUser = Math.abs(createdAt - lastSignIn) < 10_000

  const inviteToken = extractInviteToken(next)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? null
  const userAgent = request.headers.get('user-agent') ?? null
  const referrer = request.headers.get('referer') ?? null

  // Log analytics event (fire and forget — don't block auth redirect)
  logAnalyticsEvent(admin, {
    event_type: isNewUser ? 'user_signed_up' : 'user_signed_in',
    user_id: user.id,
    user_email: user.email ?? null,
    user_name: user.user_metadata?.full_name ?? null,
    is_new_user: isNewUser,
    invite_token: inviteToken,
    referrer_url: referrer,
    ip_address: ip,
    user_agent: userAgent,
    metadata: { next, provider: 'google' },
  })

  if (user.email) {
    // Check if they have a provider account (by email OR by user_id)
    const { data: providerRows } = await (admin.from('providers') as any)
      .select('id, status, user_id')
      .or(`email.eq.${user.email},user_id.eq.${user.id}`)
      .limit(10)

    const provider = (providerRows as any[])?.find((p: any) => p.status === 'approved')
      ?? (providerRows as any[])?.find((p: any) => p.status === 'pending')
      ?? providerRows?.[0]
      ?? null

    if (provider) {
      // Link user_id to provider if not already linked (backfill)
      if (!provider.user_id) {
        await (admin.from('providers') as any)
          .update({ user_id: user.id })
          .eq('id', provider.id)
      }

      if (provider.status === 'approved') {
        // Approved provider — always go to dashboard
        // EXCEPTION: if they clicked a walker invite link, handle that first
        if (next.startsWith('/join-as-provider/')) {
          return NextResponse.redirect(`${base}${next}`)
        }
        return NextResponse.redirect(`${base}/pro/dashboard`)
      }
      if (provider.status === 'pending') {
        return NextResponse.redirect(`${base}/pro?status=pending`)
      }
      // rejected — fall through to customer/owner routing
    } else if (next === '/pro/register') {
      const name  = encodeURIComponent(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '')
      const email = encodeURIComponent(user.email)
      return NextResponse.redirect(`${base}/join?from=google&name=${name}&email=${email}`)
    } else if (next.startsWith('/pro')) {
      return NextResponse.redirect(`${base}/pro?status=no_account`)
    }
  }

  // Going to a walker invite link — let that route handle linking
  if (next.startsWith('/join-as-provider/')) {
    return NextResponse.redirect(`${base}${next}`)
  }

  // NEW OWNER: redirect to onboarding if this is their first login
  // and they're not being sent somewhere specific
  if (isNewUser && next === '/') {
    // Check if profile exists and onboarding not yet completed
    const { data: profile } = await (admin.from('profiles') as any)
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    const needsOnboarding = !profile?.onboarding_completed
    if (needsOnboarding) {
      return NextResponse.redirect(`${base}/onboarding`)
    }
  }

  return NextResponse.redirect(`${base}${next}`)
}
