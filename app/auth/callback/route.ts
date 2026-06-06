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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code   = searchParams.get('code')
  const next   = searchParams.get('next') ?? '/'
  const base   = resolveBase(request)

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

  // Get the signed-in user
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: provider } = await (admin.from('providers') as any)
      .select('id, status')
      .eq('email', user.email)
      .single()

    if (provider) {
      if (provider.status === 'approved') {
        // ✅ Approved provider — always go to dashboard regardless of where they came from
        return NextResponse.redirect(`${base}/pro/dashboard`)
      }
      if (provider.status === 'pending') {
        // ⏳ Applied but not approved yet
        return NextResponse.redirect(`${base}/pro?status=pending`)
      }
      // rejected — fall through to customer redirect
    } else if (next.startsWith('/pro')) {
      // 🆕 They tried to log in as a provider but have no record — send to join
      // Pass their Google name + email as query params for pre-fill
      const name  = encodeURIComponent(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '')
      const email = encodeURIComponent(user.email)
      return NextResponse.redirect(`${base}/join?from=google&name=${name}&email=${email}`)
    }
  }

  // Default: go wherever `next` says (customer flow)
  return NextResponse.redirect(`${base}${next}`)
}
