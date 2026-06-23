interface EmailOpts {
  to: string
  subject: string
  html: string
}

export async function sendEmail(opts: EmailOpts): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: 'PupStep <hello@pupstep.in>', ...opts }),
    })
  } catch (err) {
    console.error('[email] send failed', err)
  }
}

export function emailTemplate(
  title: string,
  body: string,
  ctaText?: string,
  ctaUrl?: string,
): string {
  const ctaBlock =
    ctaText && ctaUrl
      ? `
        <div style="text-align:center;margin:32px 0;">
          <a href="${ctaUrl}"
             style="display:inline-block;background:#FF8C52;color:#ffffff;text-decoration:none;
                    font-size:16px;font-weight:600;border-radius:8px;padding:12px 24px;">
            ${ctaText}
          </a>
        </div>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#FFFBEB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#FFFBEB;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#ffffff;border-radius:12px;
                      box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #F3F4F6;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#0A2F35;">${title}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 40px 8px;">
              <p style="margin:0;font-size:16px;color:#444444;line-height:1.6;">${body}</p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px;">
              ${ctaBlock}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #F3F4F6;">
              <p style="margin:0;font-size:13px;color:#9CA3AF;text-align:center;">
                The PupStep Team &middot;
                <a href="https://pupstep.in" style="color:#9CA3AF;text-decoration:underline;">pupstep.in</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
