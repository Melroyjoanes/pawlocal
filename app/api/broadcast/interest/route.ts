import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'melroy@verfolia.com'

// POST /api/broadcast/interest — provider taps "I'm Interested"
export async function POST(req: NextRequest) {
  const { broadcast_id, provider_name, service_slug, area } = await req.json()

  if (!broadcast_id || !provider_name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Fire-and-forget email to admin
  if (process.env.RESEND_API_KEY) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PawLocal <onboarding@resend.dev>',
        to: ADMIN_EMAIL,
        subject: `🐾 Provider interest: ${provider_name} → ${service_slug} in ${area}`,
        html: `
          <h2 style="color:#0f766e;">New provider interest on PawLocal</h2>
          <p><strong>Provider:</strong> ${provider_name}</p>
          <p><strong>Service:</strong> ${service_slug}</p>
          <p><strong>Area:</strong> ${area}</p>
          <p><strong>Broadcast ID:</strong> <code>${broadcast_id}</code></p>
          <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
            <p style="margin:0;color:#15803d;"><strong>Action needed:</strong> Go to the admin broadcasts tab, find this request, and use "Notify these providers" to connect <strong>${provider_name}</strong> with the customer on WhatsApp.</p>
          </div>
          <p style="margin-top:16px;font-size:12px;color:#94a3b8;">
            Admin: <a href="https://pupstep.in/admin">pupstep.in/admin</a>
          </p>
        `,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
