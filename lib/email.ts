interface EmailOpts {
  to: string
  subject: string
  html: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'
const LOGO_URL = `${SITE_URL}/logo.webp`

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

// ── Shared layout wrapper ──────────────────────────────────────────────────────
function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="x-apple-disable-message-reformatting"/>
</head>
<body style="margin:0;padding:0;background-color:#FFFBEB;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;">
  <tr><td align="center" style="padding:32px 16px 48px;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

      <!-- Logo -->
      <tr>
        <td align="center" style="padding-bottom:24px;">
          <img src="${LOGO_URL}" alt="PupStep" width="140" height="52"
               style="height:44px;width:auto;display:block;" />
        </td>
      </tr>

      <!-- Card -->
      <tr>
        <td style="background:#ffffff;border-radius:20px;overflow:hidden;
                   box-shadow:0 4px 32px rgba(10,47,53,0.10);">
          ${content}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" style="padding:24px 16px 0;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.7;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            PupStep &middot; GPS walk reports for Mumbai dogs<br/>
            <a href="${SITE_URL}" style="color:#9CA3AF;text-decoration:underline;">pupstep.in</a>
            &nbsp;&middot;&nbsp;
            <a href="${SITE_URL}/privacy-policy" style="color:#9CA3AF;text-decoration:underline;">Privacy</a>
            &nbsp;&middot;&nbsp;
            <a href="${SITE_URL}/terms" style="color:#9CA3AF;text-decoration:underline;">Terms</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ── Teal header band ───────────────────────────────────────────────────────────
function header(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#0A2F35;padding:28px 36px 24px;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                  letter-spacing:-0.2px;">
          ${text}
        </p>
      </td>
    </tr>
  </table>`
}

// ── Body text ─────────────────────────────────────────────────────────────────
function body(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:28px 36px 24px;">
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.75;
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          ${html}
        </p>
      </td>
    </tr>
  </table>`
}

// ── CTA button ────────────────────────────────────────────────────────────────
function cta(text: string, url: string, color = '#FF8C52'): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:0 36px 32px;" align="center">
        <a href="${url}"
           style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;
                  font-size:16px;font-weight:700;border-radius:12px;padding:14px 36px;
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                  letter-spacing:0.01em;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`
}

// ── Stat pills row ────────────────────────────────────────────────────────────
function statPills(pills: Array<{ icon: string; label: string }>): string {
  const items = pills.map(p =>
    `<td style="padding:8px 12px;background:#F9FAFB;border-radius:8px;white-space:nowrap;">
      <span style="font-size:13px;color:#374151;font-family:-apple-system,sans-serif;">${p.icon} ${p.label}</span>
    </td>`
  ).join('<td style="width:8px"></td>')

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 36px 24px;">
    <tr>${items}</tr>
  </table>`
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC TEMPLATES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generic branded template. Used for trial warnings, renewal reminders, etc.
 */
export function emailTemplate(
  title: string,
  bodyHtml: string,
  ctaText?: string,
  ctaUrl?: string,
): string {
  const ctaBlock = ctaText && ctaUrl ? cta(ctaText, ctaUrl) : ''
  return layout(
    header(title) +
    body(bodyHtml.replace(/\n/g, '<br/>')) +
    ctaBlock
  )
}

/**
 * OTP sign-in code email. Big centred 6-digit code.
 * Use {{ .Token }} in Supabase Email Templates → Magic Link.
 */
export function otpEmailTemplate(code: string, expiryMins = 60): string {
  const content = `
    <!-- Teal top accent -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:oklch(0.48 0.17 196);height:6px;"></td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:36px 36px 12px;" align="center">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:oklch(0.40 0.17 196);
                    text-transform:uppercase;letter-spacing:0.12em;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            Sign-in code
          </p>
          <p style="margin:0 0 28px;font-size:14px;color:#6B7280;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            Enter this code in the PupStep app to continue.
          </p>

          <!-- The big code box -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr>
              <td style="background:#FFFBEB;border:2.5px solid #0A2F35;border-radius:16px;
                         padding:20px 48px;">
                <p style="margin:0;font-size:44px;font-weight:800;color:#0A2F35;
                           letter-spacing:14px;font-family:'Courier New',Courier,monospace;">
                  ${code}
                </p>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            Expires in ${expiryMins} minutes &middot; If you didn't request this, ignore this email.
          </p>
        </td>
      </tr>
      <tr><td style="height:32px;"></td></tr>
    </table>`

  return layout(content)
}

/**
 * Walk report notification sent to parent when walker generates a report.
 */
export function walkReportEmail(opts: {
  dogName: string
  walkerName: string
  durationMins: number | null
  distanceKm: number | null
  poopCount: number
  peeCount: number
  reportUrl: string
  reportDate?: string
  trialExpiryLabel?: string
}): string {
  const { dogName, walkerName, durationMins, distanceKm, poopCount, peeCount, reportUrl, trialExpiryLabel } = opts

  const trialBanner = trialExpiryLabel
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:20px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0;font-size:14px;color:#0F766E;line-height:1.6;font-weight:600;
                            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    🎉 Welcome to PupStep! Your 3-day free trial has started.
                  </p>
                  <p style="margin:6px 0 0;font-size:13px;color:#374151;line-height:1.6;font-weight:400;
                            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    You'll receive walk reports like this one until ${trialExpiryLabel}. After that, upgrade for ₹199/month to keep reports coming.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
    : ''

  const pills: Array<{ icon: string; label: string }> = []
  if (durationMins) pills.push({ icon: '⏱', label: `${durationMins} min` })
  if (distanceKm) pills.push({ icon: '📍', label: `${distanceKm.toFixed(1)} km` })
  if (poopCount > 0) pills.push({ icon: '💩', label: `${poopCount}` })
  if (peeCount > 0) pills.push({ icon: '💧', label: `${peeCount}` })

  const statsRow = pills.length > 0 ? statPills(pills) : ''

  const content =
    `<!-- Teal header -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#0A2F35;padding:24px 36px 20px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.6);
                    text-transform:uppercase;letter-spacing:0.1em;
                    font-family:-apple-system,sans-serif;">Walk report</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.2;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            ${dogName}'s walk is done 🐾
          </p>
        </td>
      </tr>
    </table>

    ${trialBanner}

    <!-- Walker info -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:20px 36px 16px;">
          <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            <strong>${walkerName}</strong> just completed a walk with ${dogName}.
            View the full GPS report with route, photos, and notes.
          </p>
        </td>
      </tr>
    </table>` +

    (statsRow ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:0 36px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            ${pills.map(p =>
              `<td style="padding:8px 14px;background:#F0FDFA;border-radius:100px;border:1px solid #99F6E4;margin-right:8px;">
                <span style="font-size:13px;font-weight:600;color:#0F766E;font-family:-apple-system,sans-serif;">${p.icon} ${p.label}</span>
              </td><td style="width:6px;"></td>`
            ).join('')}
          </tr>
        </table>
      </td></tr>
    </table>` : '') +

    cta('View walk report →', reportUrl) +

    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 36px 28px;border-top:1px solid #F3F4F6;">
          <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            You can also share this report with your vet or family by forwarding this email or copying the link.
          </p>
        </td>
      </tr>
    </table>`

  return layout(content)
}

/**
 * Supabase OTP template HTML — paste this in Supabase Dashboard →
 * Authentication → Email Templates → Magic Link
 */
export function supabaseOtpTemplateHtml(): string {
  return otpEmailTemplate('{{ .Token }}', 60)
}
