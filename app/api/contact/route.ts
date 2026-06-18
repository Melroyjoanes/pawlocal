import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, email, topic, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
