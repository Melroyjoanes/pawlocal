import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rateLimit'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  try {
    // Unauthenticated by design (it's a public contact form) and linked from
    // live pages (FAQ, privacy policy, blog) — was previously the one
    // unauthenticated, costly (Resend), rate-limitless endpoint reachable
    // from real traffic. 5 submissions per 15 minutes per IP is generous for
    // a real visitor, restrictive for a script.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'
    const { allowed } = await checkRateLimit(admin(), `contact:${ip}`, { windowSec: 900, maxHits: 5 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { name, email, topic, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    // Basic length caps — defense in depth against someone using this as a
    // bulk-email-sending or storage-filling vector, independent of the rate limit.
    if (name.length > 200 || email.length > 200 || message.length > 5000 || (topic?.length ?? 0) > 200) {
      return NextResponse.json({ error: 'Input too long' }, { status: 400 })
    }

    // Log to console in development; swap for Resend/email service when ready
    console.log('[contact form]', { name, email, topic, message, at: new Date().toISOString() })

    // If RESEND_API_KEY is set, send email — otherwise just acknowledge
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'PupStep Contact <contact@pupstep.in>',
          to: ['melroy@verfolia.com'],
          reply_to: email,
          subject: `[PupStep contact] ${topic || 'General enquiry'} — ${name}`,
          text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic || '—'}\n\n${message}`,
          html: `
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Topic:</strong> ${topic || '—'}</p>
            <hr/>
            <p>${message.replace(/\n/g, '<br/>')}</p>
          `,
        }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[contact]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
