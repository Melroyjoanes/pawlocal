import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function isProtected(pathname: string) {
  // Auth-required routes
  if (pathname === '/my-account') return { redirect: '/?auth_required=1' }
  if (pathname.startsWith('/dashboard')) return { redirect: '/account?reason=provider' }
  // Provider edit requires auth — ownership check happens in the page itself
  if (/^\/provider\/[^/]+\/edit/.test(pathname)) return { redirect: '/?auth_required=1' }
  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const protection = isProtected(pathname)
  if (!protection) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
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
  matcher: ['/my-account', '/dashboard/:path*', '/provider/:id/edit'],
}
