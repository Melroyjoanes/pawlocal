import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, category, phone, whatsapp, business_name } = body

  if (!process.env.RESEND_API_KEY) {
    // Silently succeed — notification is non-critical
    return NextResponse.json({ ok: true })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'PawLocal <onboarding@resend.dev>',
      to: 'melroy@verfolia.com',
      subject: `New provider joined: ${name}`,
      html: `
        <h2>New provider submitted on PawLocal</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Business:</strong> ${business_name ?? 'N/A'}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>WhatsApp:</strong> ${whatsapp}</p>
        <p><strong>Phone:</strong> ${phone ?? 'N/A'}</p>
        <p><a href="https://pawlocal.in/admin">Review in admin dashboard →</a></p>
      `,
    }),
  })

  if (!res.ok) {
    // Don't fail the user's submission if email fails
    console.error('Failed to send admin notification email')
  }

  return NextResponse.json({ ok: true })
}
