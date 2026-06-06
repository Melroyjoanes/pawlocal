import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const base = request.nextUrl.origin
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Not signed in — redirect to account page with return destination
    return NextResponse.redirect(`${base}/account?next=/provider/${id}`)
  }

  // Fetch provider's real WhatsApp via admin client (bypasses RLS, always returns real number)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('whatsapp, name')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (!provider?.whatsapp) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  const digits = provider.whatsapp.replace(/\D/g, '').slice(-10)
  const text = encodeURIComponent(`Hi, I found you on PawLocal! 🐾`)
  const waUrl = `https://wa.me/91${digits}?text=${text}`

  return NextResponse.redirect(waUrl)
}
