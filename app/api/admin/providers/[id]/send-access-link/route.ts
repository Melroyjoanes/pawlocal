import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()

  // Verify admin session
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || user.email !== adminEmail) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.json()
  const emailFromBody: string | undefined = body.email?.trim().toLowerCase()

  // Fetch the provider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider, error: fetchError } = await (admin.from('providers') as any)
    .select('id, name, email, status')
    .eq('id', id)
    .single()

  if (fetchError || !provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  if (provider.status !== 'approved') {
    return NextResponse.json({ error: 'Provider is not approved yet' }, { status: 400 })
  }

  // Use provided email or the one already on record
  const email: string = emailFromBody || provider.email
  if (!email) {
    return NextResponse.json({ error: 'No email address. Provide one to continue.' }, { status: 400 })
  }

  // Save email to provider record if it's new or different
  if (email !== provider.email) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('providers') as any)
      .update({ email })
      .eq('id', id)
  }

  // Generate magic link pointing to /pro/dashboard
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${siteUrl}/pro/dashboard` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message ?? 'Failed to generate link' }, { status: 500 })
  }

  const magicLink = linkData.properties.action_link

  // Return the magic link — admin sends it to the provider via WhatsApp
  return NextResponse.json({ success: true, email, magicLink })
}
