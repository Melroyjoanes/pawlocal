import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
if (!ADMIN_EMAIL) console.warn('ADMIN_EMAIL env var is not set — broadcast interest emails will not be sent')

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// POST /api/broadcast/interest — provider taps "I'm Interested"
export async function POST(req: NextRequest) {
  const { broadcast_id, provider_name, service_slug, area } = await req.json()

  if (!broadcast_id || !provider_name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Validate broadcast_id looks like a UUID to prevent junk data
  if (!/^[0-9a-f-]{36}$/i.test(String(broadcast_id))) {
    return NextResponse.json({ error: 'Invalid broadcast_id' }, { status: 400 })
  }

  // Fire-and-forget email to admin
  if (process.env.RESEND_API_KEY && ADMIN_EMAIL) {
    const safeName = esc(provider_name)
    const safeSlug = esc(service_slug)
    const safeArea = esc(area)
    const safeBid  = esc(broadcast_id)

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PupStep <onboarding@resend.dev>',
        to: ADMIN_EMAIL,
        subject: `Provider interest: ${safeName} — ${safeSlug} in ${safeArea}`,
        html: `
          <h2 style="color:#0f766e;">New provider interest on PupStep</h2>
          <p><strong>Provider:</strong> ${safeName}</p>
          <p><strong>Service:</strong> ${safeSlug}</p>
          <p><strong>Area:</strong> ${safeArea}</p>
          <p><strong>Broadcast ID:</strong> <code>${safeBid}</code></p>
          <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
            <p style="margin:0;color:#15803d;"><strong>Action needed:</strong> Go to the admin broadcasts tab, find this request, and use "Notify these providers" to connect <strong>${safeName}</strong> with the customer on WhatsApp.</p>
          </div>
          <p style="margin-top:16px;font-size:12px;color:#94a3b8;">
            Admin: <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/admin">${process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : 'pupstep.in'}/admin</a>
          </p>
        `,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
