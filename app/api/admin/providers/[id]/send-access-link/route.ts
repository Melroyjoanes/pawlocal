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
  if (user.email !== (process.env.ADMIN_EMAIL ?? 'melroy@verfolia.com')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pawlocal-ashen.vercel.app'
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${siteUrl}/pro/dashboard` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message ?? 'Failed to generate link' }, { status: 500 })
  }

  const magicLink = linkData.properties.action_link
  const firstName = (provider.name as string).split(' ')[0]

  // Send via Resend — and log the actual response so failures appear in Vercel logs
  let emailSent = false
  if (process.env.RESEND_API_KEY) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'PawLocal <onboarding@resend.dev>',
          to: email,
          subject: `🐾 Your PawLocal provider dashboard is ready, ${firstName}!`,
          html: `
<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;background:#FFFBEB;padding:32px 24px;border-radius:24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-size:48px;margin-bottom:12px;">🐾</div>
    <h1 style="font-size:22px;font-weight:800;color:#451A03;margin:0 0 8px;">Welcome to PawLocal, ${firstName}!</h1>
    <p style="font-size:14px;color:#78716C;margin:0;">Click below to access your provider dashboard. This link expires in 1 hour.</p>
  </div>
  <a href="${magicLink}" style="display:block;text-align:center;background:linear-gradient(160deg,#FCD34D,#F59E0B);color:#451A03;font-weight:700;font-size:15px;padding:16px;border-radius:12px;text-decoration:none;margin-bottom:20px;">
    Open my dashboard →
  </a>
  <div style="background:white;border-radius:16px;padding:20px;border:1px solid #E5E7EB;margin-bottom:16px;">
    <p style="font-size:13px;color:#6B7280;margin:0 0 8px;font-weight:600;">From your dashboard you can:</p>
    <ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:2;">
      <li>See how many people viewed your profile</li>
      <li>Reply to pet owner requests in your area</li>
      <li>Update your bio, pricing and availability</li>
    </ul>
  </div>
  <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:0;">
    Next time: go to <strong>pawlocal-ashen.vercel.app/pro</strong> and enter this email to sign in.
  </p>
</div>`,
        }),
      })
      const resendBody = await resendRes.json().catch(() => ({}))
      if (!resendRes.ok) {
        console.error('[Resend] send-access-link failed:', resendRes.status, JSON.stringify(resendBody))
      } else {
        emailSent = true
        console.log('[Resend] send-access-link sent to', email, 'id:', resendBody.id)
      }
    } catch (e: unknown) {
      console.error('[Resend] send-access-link exception:', e instanceof Error ? e.message : e)
    }
  } else {
    console.warn('[send-access-link] RESEND_API_KEY not set — email skipped')
  }

  // Always return the magic link so admin can copy it as fallback if email fails
  return NextResponse.json({ success: true, email, emailSent, magicLink })
}
