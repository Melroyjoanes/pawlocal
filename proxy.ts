import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED = [
  '/my-account',
  '/broadcast',
  '/provider',  // /provider/[id]/dashboard and /provider/[id]/edit
]

function isProtected(pathname: string) {
  if (pathname.startsWith('/provider/') && (pathname.endsWith('/dashboard') || pathname.endsWith('/edit'))) return true
  if (pathname === '/my-account' || pathname === '/broadcast') return true
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!isProtected(pathname)) return NextResponse.next()

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
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set('auth_required', '1')
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/my-account',
    '/broadcast',
    '/provider/:id/dashboard',
    '/provider/:id/edit',
  ],
}
