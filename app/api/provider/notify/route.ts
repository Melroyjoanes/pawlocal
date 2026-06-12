import { NextRequest, NextResponse } from 'next/server'

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, category, phone, whatsapp, business_name } = body

  const adminEmail = process.env.ADMIN_EMAIL
  if (!process.env.RESEND_API_KEY || !adminEmail) {
    // Non-critical — log and succeed so the provider's join isn't blocked
    if (!process.env.RESEND_API_KEY) console.warn('RESEND_API_KEY not set — skipping provider notify email')
    if (!adminEmail) console.warn('ADMIN_EMAIL not set — skipping provider notify email')
    return NextResponse.json({ ok: true })
  }

  const safeName     = esc(name)
  const safeBusiness = esc(business_name)
  const safeCategory = esc(category)
  const safeWhatsapp = esc(whatsapp)
  const safePhone    = esc(phone)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'PupStep <onboarding@resend.dev>',
      to: adminEmail,
      subject: `New provider submitted: ${safeName}`,
      html: `
        <h2>New provider submitted on PupStep</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Business:</strong> ${safeBusiness || 'N/A'}</p>
        <p><strong>Category:</strong> ${safeCategory}</p>
        <p><strong>WhatsApp:</strong> ${safeWhatsapp}</p>
        <p><strong>Phone:</strong> ${safePhone || 'N/A'}</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/admin">Review in admin dashboard →</a></p>
      `,
    }),
  })

  if (!res.ok) {
    console.error('Failed to send admin notification email')
  }

  return NextResponse.json({ ok: true })
}
