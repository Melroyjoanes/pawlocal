import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { CAMPAIGN_COOKIE, campaignFromSearchParams, redactPath } from '@/lib/campaign'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'melroy@verfolia.com'

function preserveCampaignAttribution(request: NextRequest, response: NextResponse) {
  // Keep the first campaign that introduced this visitor. GA4 handles the live
  // session; this cookie lets us attribute a later Google OAuth signup after
  // the browser has left pupstep.in and returned.
  if (request.cookies.has(CAMPAIGN_COOKIE)) return response

  // Pathname only — never the query string. A parent landing on a tagged
  // /walk-report/<token> link would otherwise write that token into the
  // cookie, and from there into analytics_events.metadata at signup. The
  // token is what grants access to that report; it does not belong in an
  // analytics record. The utm_* values are captured as their own fields
  // above, so the query adds nothing here anyway.
  const campaign = campaignFromSearchParams(
    request.nextUrl.searchParams,
    redactPath(request.nextUrl.pathname)
  )

  if (campaign) {
    response.cookies.set(CAMPAIGN_COOKIE, JSON.stringify(campaign), {
      maxAge: 60 * 60 * 24 * 90,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    })
  }

  return response
}

// Routes only the admin can access (V1 provider tools kept for internal use)
function isAdminOnly(pathname: string) {
  return (
    pathname.startsWith('/pro') ||
    pathname.startsWith('/join') ||
    pathname === '/become-a-provider' ||
    pathname.startsWith('/review') ||
    pathname.startsWith('/live') ||
    pathname.startsWith('/join-as-provider') ||
    pathname.startsWith('/join-reports')
  )
}

function isProtected(pathname: string) {
  if (pathname === '/my-account') return { redirect: '/?auth_required=1' }
  if (pathname === '/home') return { redirect: '/?auth_required=1' }
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always set x-pathname so the root layout can detect /pro, /admin, /track
  // and suppress the customer header/footer for those isolated shells.
  let response = preserveCampaignAttribution(request, NextResponse.next({ request }))
  response.headers.set('x-pathname', pathname)

  // Admin-only routes: /pro/*, /join/*, /become-a-provider, /review/*, /live/*
  // Public gets 302 to / — admin (ADMIN_EMAIL) gets through.
  if (isAdminOnly(pathname)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = preserveCampaignAttribution(request, NextResponse.next({ request }))
            response.headers.set('x-pathname', pathname)
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email === ADMIN_EMAIL) return response // admin — let through
    // Everyone else → homepage
    return preserveCampaignAttribution(request, NextResponse.redirect(new URL('/', request.url)))
  }

  // Redirect logged-in pet parents from the marketing homepage to their personal home.
  // Providers are handled by ProviderAutoRedirect on the client side.
  if (pathname === '/') {
    // Skip auto-redirect when the user just signed out — cookies may still be present
    // on this request even though the client cleared them.
    if (request.nextUrl.searchParams.get('signed_out') === '1') return response

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = preserveCampaignAttribution(request, NextResponse.next({ request }))
            response.headers.set('x-pathname', pathname)
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    // V2: all logged-in users go to /home — no V1 provider check
    if (user) {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/home'
      return preserveCampaignAttribution(request, NextResponse.redirect(homeUrl))
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
          response = preserveCampaignAttribution(request, NextResponse.next({ request }))
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
    return preserveCampaignAttribution(request, NextResponse.redirect(redirectUrl))
  }

  return response
}

export const config = {
  // Broad matcher so x-pathname is set on every page request.
  // Auth-gating logic only activates for the specific routes checked in isProtected().
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$|.*\\.svg$).*)'],
}
