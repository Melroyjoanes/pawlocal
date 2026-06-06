import { NextRequest, NextResponse } from 'next/server'

/**
 * Sets x-pathname header on every request so the root layout can
 * detect /pro and /admin routes and suppress the customer header/footer.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('x-pathname', request.nextUrl.pathname)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$|.*\\.svg$).*)'],
}
