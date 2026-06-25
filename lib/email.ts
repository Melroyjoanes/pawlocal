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

/**
 * PupStep branded email template.
 * Uses table-based layout for maximum email client compatibility.
 * Theme: cream #FFFBEB bg, teal #0D7F8C header, orange #FF8C52 CTA.
 */
export function emailTemplate(
  title: string,
  body: string,
  ctaText?: string,
  ctaUrl?: string,
): string {
  const cta = ctaText && ctaUrl
    ? `<tr>
        <td style="padding:0 36px 32px;text-align:center;">
          <a href="${ctaUrl}"
             style="display:inline-block;background:#FF8C52;color:#ffffff;text-decoration:none;
                    font-size:16px;font-weight:700;border-radius:12px;padding:14px 32px;
                    letter-spacing:0.01em;">
            ${ctaText}
          </a>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#FFFBEB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#FFFBEB;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;">

          <!-- ── Logo bar ── -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <span style="font-size:26px;font-weight:800;color:#0A2F35;letter-spacing:-0.5px;">
                PupStep 🐾
              </span>
            </td>
          </tr>

          <!-- ── Card ── -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;
                       box-shadow:0 4px 24px rgba(10,47,53,0.10);">

              <!-- Teal header band -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0A2F35;padding:28px 36px 24px;">
                    <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;
                              line-height:1.3;letter-spacing:-0.2px;">
                      ${title}
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:28px 36px 24px;">
                    <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">
                      ${body.replace(/\n/g, '<br/>')}
                    </p>
                  </td>
                </tr>

                <!-- CTA -->
                ${cta}

              </table>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td align="center" style="padding:24px 16px 8px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
                You're receiving this from PupStep because you signed up at
                <a href="https://pupstep.in" style="color:#9CA3AF;">pupstep.in</a>.<br/>
                Juhu, Mumbai &middot; Made with 🐾 for dog parents.
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

/**
 * Specialised OTP email template — big centred code, no distractions.
 */
export function otpEmailTemplate(code: string, expiryMins = 60): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your PupStep sign-in code</title>
</head>
<body style="margin:0;padding:0;background-color:#FFFBEB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#FFFBEB;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:440px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:26px;font-weight:800;color:#0A2F35;">PupStep 🐾</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;
                       box-shadow:0 4px 24px rgba(10,47,53,0.10);text-align:center;
                       padding:40px 36px;">

              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0D7F8C;
                        text-transform:uppercase;letter-spacing:0.1em;">
                Sign-in code
              </p>

              <p style="margin:0 0 24px;font-size:13px;color:#6B7280;">
                Enter this code in the PupStep app to continue.
              </p>

              <!-- The big code -->
              <div style="display:inline-block;background:#FFFBEB;border:2.5px solid #0A2F35;
                          border-radius:16px;padding:20px 40px;margin-bottom:24px;">
                <span style="font-size:40px;font-weight:800;color:#0A2F35;
                             letter-spacing:12px;font-family:monospace;">
                  ${code}
                </span>
              </div>

              <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
                This code expires in ${expiryMins} minutes.<br/>
                If you didn't request this, you can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 16px 8px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">
                PupStep &middot; <a href="https://pupstep.in" style="color:#9CA3AF;">pupstep.in</a>
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
