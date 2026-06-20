/**
 * Creates three test accounts for local/staging testing.
 *
 * Run:  node scripts/seed-test-accounts.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually (no dotenv dependency)
const env = {}
try {
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .forEach(line => {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) env[key.trim()] = rest.join('=').trim()
    })
} catch {
  console.error('❌ Could not read .env.local — run from the project root:\n  cd "/Users/melroy/Desktop/desktop dump/pawlocal"\n  node scripts/seed-test-accounts.mjs')
  process.exit(1)
}

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'],
)

const DEFAULT_PASSWORD = 'PupStep@2025'

const ACCOUNTS = [
  {
    email: 'melroy@verfolia.com',
    label: 'Admin',
    role: 'admin',
    displayName: 'Melroy (Admin)',
  },
  {
    email: 'joanesmelroy@gmail.com',
    label: 'Provider',
    role: 'provider',
    displayName: 'Joanes (Provider)',
    provider: {
      name: 'Joanes Melroy',
      business_name: 'Joanes Pet Care',
      category_slug: 'dog-walking',
      whatsapp: '919999999999',
      phone: '9999999999',
      lat: 19.0997,
      lng: 72.8265,
      address: 'Juhu, Mumbai 400049',
      price_min: 300,
      price_max: 500,
      price_unit: 'per walk',
      bio: 'Test provider account — dog walking in Juhu. Verified & approved.',
      status: 'approved',
      is_verified: true,
      verification_tier: 'verified',
      neighbourhood: 'Juhu',
      category_slugs: ['dog-walking'],
      email: 'joanesmelroy@gmail.com',
    },
  },
  {
    email: 'melroy@gradienteye.com',
    label: 'Pet Parent',
    role: 'customer',
    displayName: 'Melroy (Parent)',
  },
]

async function upsertUser({ email, label, role, displayName, provider: providerData }) {
  console.log(`\n🔧 Setting up ${label} — ${email}`)

  // Create or fetch auth user
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  })

  let userId

  if (createErr) {
    if (createErr.message?.includes('already been registered') || createErr.message?.includes('already exists')) {
      // User already exists — fetch by email
      const { data: list } = await supabase.auth.admin.listUsers()
      const existing = list?.users?.find(u => u.email === email)
      if (!existing) {
        console.error(`  ✗ Could not find existing user: ${createErr.message}`)
        return
      }
      userId = existing.id
      console.log(`  ↩ User already exists (${userId}), updating...`)
    } else {
      console.error(`  ✗ Create user failed: ${createErr.message}`)
      return
    }
  } else {
    userId = created.user.id
    console.log(`  ✓ Auth user created (${userId})`)
  }

  // Upsert profile with correct role
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, role, display_name: displayName }, { onConflict: 'id' })

  if (profileErr) {
    console.error(`  ✗ Profile upsert failed: ${profileErr.message}`)
  } else {
    console.log(`  ✓ Profile set — role: ${role}`)
  }

  // Create provider row if needed
  if (providerData) {
    // Check if a provider is already linked to this user
    const { data: existing } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      console.log(`  ↩ Provider row already linked (${existing.id}), skipping`)
    } else {
      const { data: prov, error: provErr } = await supabase
        .from('providers')
        .insert({ ...providerData, user_id: userId })
        .select('id')
        .single()

      if (provErr) {
        console.error(`  ✗ Provider insert failed: ${provErr.message}`)
      } else {
        console.log(`  ✓ Provider row created (${prov.id})`)
      }
    }
  }
}

console.log('━'.repeat(50))
console.log('PupStep — Test Account Seeder')
console.log('━'.repeat(50))
console.log(`Password for all accounts: ${DEFAULT_PASSWORD}`)

for (const account of ACCOUNTS) {
  await upsertUser(account)
}

console.log('\n━'.repeat(50))
console.log('Done! Accounts ready:')
console.log(`  Admin    → melroy@verfolia.com`)
console.log(`  Provider → joanesmelroy@gmail.com`)
console.log(`  Parent   → melroy@gradienteye.com`)
console.log(`  Password → ${DEFAULT_PASSWORD}`)
console.log('━'.repeat(50))
