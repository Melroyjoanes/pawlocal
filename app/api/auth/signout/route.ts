import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const response = NextResponse.redirect(
    new URL('/?signed_out=1', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    { status: 302 }
  )
  return response
}
