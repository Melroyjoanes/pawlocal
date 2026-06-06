import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check email is an approved provider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('id, name, email')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'approved')
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'not_registered' }, { status: 404 })
  }

  // Generate magic link
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: email.toLowerCase().trim(),
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pawlocal-ashen.vercel.app'}/pro/dashboard`,
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send via Resend
  if (process.env.RESEND_API_KEY && data?.properties?.action_link) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PawLocal <onboarding@resend.dev>',
        to: email,
        subject: '🐾 Your PawLocal sign-in link',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="font-size:20px;color:#0f172a;">Sign in to PawLocal</h2>
          <p style="color:#475569;font-size:14px;">Click the button below to sign in. This link expires in 1 hour.</p>
          <a href="${data.properties.action_link}" style="display:inline-block;margin:16px 0;background:oklch(0.48 0.17 196);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Sign in to my dashboard →</a>
          <p style="color:#94a3b8;font-size:12px;">If you didn't request this, ignore this email.</p>
        </div>`,
      }),
    }).catch((e: unknown) => { console.error("[Resend] email failed:", e instanceof Error ? e.message : e) })
  }

  return NextResponse.json({ success: true })
}
