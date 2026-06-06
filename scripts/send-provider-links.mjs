/**
 * Generates magic links for specific provider IDs and sends them by email.
 * Also prints the link to console so you can copy-paste to WhatsApp.
 *
 * Usage:  node scripts/send-provider-links.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Load .env.local ────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map((p, i) => i === 0 ? p.trim() : l.slice(l.indexOf('=') + 1).trim()))
)

const SUPABASE_URL        = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY    = env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY      = env.RESEND_API_KEY  // optional — emails only sent if present
const SITE_URL            = env.NEXT_PUBLIC_SITE_URL ?? 'https://pawlocal-ashen.vercel.app'

// ── Provider IDs to process ────────────────────────────────────────────────
const PROVIDER_IDS = [
  'cfcec476-66eb-4b2c-9be7-dddb707e5816',
  '73eaffbe-ebf5-44d5-82ea-168cb3c26a4f',
  '8409bcad-869c-49ac-ad3c-463ea3b276d5',
]

// ──────────────────────────────────────────────────────────────────────────

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.log('  ⚠  RESEND_API_KEY not in .env.local — email skipped')
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: 'PawLocal <onboarding@resend.dev>', to, subject, html }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('  ✗ Resend error:', res.status, JSON.stringify(body))
    return false
  }
  console.log('  ✓ Email sent — id:', body.id)
  return true
}

async function processProvider(id) {
  console.log(`\n── Provider ${id} ──`)

  // Fetch provider record
  const { data: provider, error } = await admin
    .from('providers')
    .select('id, name, email, status')
    .eq('id', id)
    .single()

  if (error || !provider) {
    console.error('  ✗ Not found:', error?.message)
    return
  }

  console.log(`  Name:   ${provider.name}`)
  console.log(`  Email:  ${provider.email ?? '(none)'}`)
  console.log(`  Status: ${provider.status}`)

  if (provider.status !== 'approved') {
    console.log('  ⚠  Not approved — skipping')
    return
  }

  if (!provider.email) {
    console.log('  ⚠  No email on record — cannot send magic link')
    console.log(`  → Profile: ${SITE_URL}/provider/${id}`)
    return
  }

  // Generate magic link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: provider.email,
    options: { redirectTo: `${SITE_URL}/pro/dashboard` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    console.error('  ✗ Failed to generate link:', linkError?.message)
    return
  }

  const magicLink = linkData.properties.action_link
  const firstName = provider.name.split(' ')[0]

  console.log(`\n  🔗 Magic link (copy for WhatsApp):\n  ${magicLink}\n`)

  // Send email
  await sendEmail(
    provider.email,
    `🐾 Your PawLocal provider dashboard is ready, ${firstName}!`,
    `
<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;background:#FFFBEB;padding:32px 24px;border-radius:24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-size:48px;margin-bottom:12px;">🐾</div>
    <h1 style="font-size:22px;font-weight:800;color:#451A03;margin:0 0 8px;">Welcome to PawLocal, ${firstName}!</h1>
    <p style="font-size:14px;color:#78716C;margin:0;">Your profile is live on PawLocal. Click the button below to access your provider dashboard.</p>
  </div>
  <a href="${magicLink}" style="display:block;text-align:center;background:linear-gradient(160deg,#FCD34D,#F59E0B);color:#451A03;font-weight:700;font-size:15px;padding:16px;border-radius:12px;text-decoration:none;margin-bottom:20px;">
    Open my dashboard →
  </a>
  <div style="background:white;border-radius:16px;padding:20px;border:1px solid #E5E7EB;margin-bottom:16px;">
    <p style="font-size:13px;color:#6B7280;margin:0 0 8px;font-weight:600;">From your dashboard you can:</p>
    <ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:2;">
      <li>See how many people viewed your profile</li>
      <li>Reply to pet owner requests in your area</li>
      <li>Update your bio, pricing and availability</li>
      <li>Toggle your availability on/off</li>
    </ul>
  </div>
  <p style="font-size:13px;color:#6B7280;text-align:center;margin:0 0 8px;">
    Next time, go to <strong>pawlocal-ashen.vercel.app/pro</strong> and enter this email to sign in.
  </p>
  <p style="font-size:11px;color:#9CA3AF;text-align:center;margin:0;">This link expires in 1 hour.</p>
</div>`
  )
}

// Run
console.log('PawLocal — Provider access link sender')
console.log('Site URL:', SITE_URL)
console.log('Resend:', RESEND_API_KEY ? '✓ configured' : '✗ not configured (emails will be skipped)')

for (const id of PROVIDER_IDS) {
  await processProvider(id)
}

console.log('\n✅ Done.')
