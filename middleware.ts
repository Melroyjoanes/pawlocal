import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function isProtected(pathname: string) {
  if (pathname === '/my-account') return { redirect: '/?auth_required=1' }
  if (pathname === '/home') return { redirect: '/?auth_required=1' }
  if (pathname.startsWith('/dashboard')) return { redirect: '/account?reason=provider' }
  if (/^\/provider\/[^/]+\/edit/.test(pathname)) return { redirect: '/?auth_required=1' }
  if (pathname.startsWith('/pro/')) return { redirect: '/pro' }
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always set x-pathname so the root layout can detect /pro, /admin, /track
  // and suppress the customer header/footer for those isolated shells.
  let response = NextResponse.next({ request })
  response.headers.set('x-pathname', pathname)

  // Redirect logged-in pet parents from the marketing homepage to their personal home.
  // Providers are handled by ProviderAutoRedirect on the client side.
  if (pathname === '/') {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            response.headers.set('x-pathname', pathname)
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: providerRow } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!providerRow) {
        const homeUrl = request.nextUrl.clone()
        homeUrl.pathname = '/home'
        homeUrl.search = ''
        return NextResponse.redirect(homeUrl)
      }
    }
    return response
  }

  const protection = isProtected(pathname)
  if (!protection) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          response.headers.set('x-pathname', pathname)
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const redirectUrl = request.nextUrl.clone()
    const [redirectPath, qs] = protection.redirect.split('?')
    redirectUrl.pathname = redirectPath
    redirectUrl.search = qs ? `?${qs}&next=${encodeURIComponent(pathname)}` : `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  // Broad matcher so x-pathname is set on every page request.
  // Auth-gating logic only activates for the specific routes checked in isProtected().
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$|.*\\.svg$).*)'],
}
