/**
 * import-places.mjs
 *
 * Pulls pet-related businesses from Google Places API across Mumbai
 * and upserts them into the PawLocal providers table.
 *
 * Usage:
 *   node scripts/import-places.mjs
 *
 * Requirements:
 *   - Places API must be enabled in Google Cloud Console
 *   - Run migration 004_google_places_source.sql in Supabase first
 *   - .env.local must be present with NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 *     and SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
const env = {}
try {
  readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) env[key.trim()] = rest.join('=').trim()
    })
} catch {
  console.error('Could not read .env.local — ensure you run this from the project root')
  process.exit(1)
}

const MAPS_KEY = env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!MAPS_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Check .env.local.')
  process.exit(1)
}

// ── Pre-flight: verify DB columns exist before touching Google API ────────────
async function preflight() {
  console.log('Checking database schema...')

  // Try inserting a test row with all the fields we need
  // Use a clearly fake place_id so it never conflicts with real data
  const testRow = {
    name: '__preflight_test__',
    category_slug: 'pet-store',
    category_slugs: ['pet-store'],
    whatsapp: '0000000000',
    lat: 0, lng: 0,
    address: 'test',
    source: 'google_places',
    google_place_id: '__preflight_test__',
    status: 'approved',
    is_verified: false,
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/providers?on_conflict=google_place_id`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify(testRow),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    console.log('\n❌ DB pre-flight failed. Raw error from Supabase:\n')
    console.log(body)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('This means the required columns are missing.')
    console.log('Go to Supabase → SQL Editor → New query and run:\n')
    console.log(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';`)
    console.log(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS google_place_id text;`)
    console.log(`CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_google_place_id`)
    console.log(`  ON providers(google_place_id) WHERE google_place_id IS NOT NULL;`)
    console.log(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS category_slugs text[] DEFAULT '{}';`)
    console.log(`CREATE INDEX IF NOT EXISTS idx_providers_category_slugs ON providers USING GIN(category_slugs);`)
    console.log('\nThen re-run: node scripts/import-places.mjs')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    process.exit(1)
  }

  // Clean up the test row
  await fetch(
    `${SUPABASE_URL}/rest/v1/providers?google_place_id=eq.__preflight_test__`,
    {
      method: 'DELETE',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  )

  console.log('✅ DB schema OK — all required columns exist\n')
}

// ── Config ───────────────────────────────────────────────────────────────────

// Mumbai search centres — covers Juhu, Bandra, Andheri, Powai, Worli, Borivali, Thane, Navi Mumbai
const SEARCH_CENTRES = [
  { name: 'Juhu',          lat: 19.1075, lng: 72.8263 },
  { name: 'Bandra',        lat: 19.0596, lng: 72.8295 },
  { name: 'Andheri West',  lat: 19.1197, lng: 72.8468 },
  { name: 'Andheri East',  lat: 19.1136, lng: 72.8697 },
  { name: 'Borivali',      lat: 19.2307, lng: 72.8567 },
  { name: 'Powai',         lat: 19.1176, lng: 72.9060 },
  { name: 'Worli',         lat: 19.0176, lng: 72.8181 },
  { name: 'Thane',         lat: 19.2183, lng: 72.9781 },
]

// Places API type → PawLocal category_slug mapping
const SEARCH_TYPES = [
  { googleType: 'pet_store',       categorySlug: 'pet-store',  label: 'Pet Store'  },
  { googleType: 'veterinary_care', categorySlug: 'vet',        label: 'Vet'        },
]

// Text searches for categories without a dedicated Google type
const TEXT_SEARCHES = [
  { query: 'dog grooming salon Mumbai',  categorySlug: 'grooming',     label: 'Grooming'     },
  { query: 'dog grooming shop Mumbai',   categorySlug: 'grooming',     label: 'Grooming'     },
  { query: 'dog walker Mumbai',          categorySlug: 'dog-walking',  label: 'Dog Walking'  },
  { query: 'pet grooming Mumbai',        categorySlug: 'grooming',     label: 'Grooming'     },
  { query: 'dog bathing Mumbai',         categorySlug: 'grooming',     label: 'Grooming'     },
]

const SEARCH_RADIUS_M = 5000  // 5 km radius per centre
const DELAY_MS = 300          // polite delay between API calls

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms))
}

async function placesNearbySearch(lat, lng, type, pageToken = null) {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(SEARCH_RADIUS_M),
    type,
    key: MAPS_KEY,
  })
  if (pageToken) params.set('pagetoken', pageToken)

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
  )
  return res.json()
}

async function placesTextSearch(query, pageToken = null) {
  const params = new URLSearchParams({ query, key: MAPS_KEY })
  if (pageToken) params.set('pagetoken', pageToken)

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
  )
  return res.json()
}

async function placeDetails(placeId) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_phone_number,international_phone_number,opening_hours,formatted_address,geometry',
    key: MAPS_KEY,
  })
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  )
  const data = await res.json()
  return data.result ?? {}
}

// Collect all pages from a search result (up to 3 pages = 60 results max)
async function collectAllPages(firstPage) {
  const results = [...(firstPage.results ?? [])]
  let nextPageToken = firstPage.next_page_token

  while (nextPageToken) {
    await sleep(2000) // Google requires a short delay before page token is valid
    const page = await placesNearbySearch(null, null, null, nextPageToken)
    results.push(...(page.results ?? []))
    nextPageToken = page.next_page_token
  }
  return results
}

async function collectAllTextPages(firstPage) {
  const results = [...(firstPage.results ?? [])]
  let nextPageToken = firstPage.next_page_token

  while (nextPageToken) {
    await sleep(2000)
    const page = await placesTextSearch(null, nextPageToken)
    results.push(...(page.results ?? []))
    nextPageToken = page.next_page_token
  }
  return results
}

// Convert Google place result to a PawLocal provider row
function placeToProvider(place, details, categorySlug) {
  const lat = place.geometry?.location?.lat ?? details.geometry?.location?.lat
  const lng = place.geometry?.location?.lng ?? details.geometry?.location?.lng

  if (!lat || !lng) return null

  const rawPhone = details.formatted_phone_number ?? details.international_phone_number ?? ''
  // Strip country code prefix and non-digits for whatsapp field
  const cleanPhone = rawPhone.replace(/^\+91[\s-]?/, '').replace(/\D/g, '')

  const hours = details.opening_hours?.periods
  let hoursFrom = '09:00'
  let hoursTo = '20:00'
  if (hours && hours[0]) {
    const open = hours[0].open?.time
    const close = hours[0].close?.time
    if (open) hoursFrom = `${open.slice(0, 2)}:${open.slice(2)}`
    if (close) hoursTo = `${close.slice(0, 2)}:${close.slice(2)}`
  }

  const address = place.vicinity ?? details.formatted_address ?? 'Mumbai'

  return {
    name: place.name,
    business_name: place.name,
    category_slug: categorySlug,
    whatsapp: cleanPhone || '9999999999', // placeholder if no phone — admin can update
    phone: cleanPhone || null,
    lat,
    lng,
    address,
    hours_from: hoursFrom,
    hours_to: hoursTo,
    working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    bio: null,
    status: 'approved',
    is_verified: false,
    source: 'google_places',
    google_place_id: place.place_id,
  }
}

let firstErrorShown = false

// Upsert a single provider via Supabase REST API
// Uses google_place_id as the conflict key — safe to re-run
async function upsertProvider(provider) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/providers?on_conflict=google_place_id`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(provider),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    if (!firstErrorShown) {
      firstErrorShown = true
      console.log('\n\n❌ UPSERT FAILED — first error:')
      console.log(err)
      console.log('\n👉 This almost always means migration 004 has NOT been run.')
      console.log('   Go to Supabase → SQL Editor and run this:\n')
      console.log('   ALTER TABLE providers ADD COLUMN IF NOT EXISTS source text DEFAULT \'manual\';')
      console.log('   ALTER TABLE providers ADD COLUMN IF NOT EXISTS google_place_id text;')
      console.log('   CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_google_place_id')
      console.log('     ON providers(google_place_id) WHERE google_place_id IS NOT NULL;\n')
      console.log('   Then re-run: node scripts/import-places.mjs\n')
      process.exit(1)
    }
    return { error: err }
  }
  return { ok: true }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🐾 PawLocal — Google Places import')
  console.log('====================================\n')

  // Fail immediately if DB columns are missing — before any Google API calls
  await preflight()

  const seen = new Set()    // deduplicate across search runs
  let totalImported = 0
  let totalSkipped = 0

  // ── 1. Nearby searches by type ───────────────────────────────────────────
  for (const { googleType, categorySlug, label } of SEARCH_TYPES) {
    for (const centre of SEARCH_CENTRES) {
      process.stdout.write(`Searching ${label} near ${centre.name}... `)
      await sleep(DELAY_MS)

      const first = await placesNearbySearch(centre.lat, centre.lng, googleType)
      if (first.status === 'REQUEST_DENIED' || first.status === 'INVALID_REQUEST') {
        console.log(`\n❌ Places API error: ${first.status} — ${first.error_message}`)
        console.log('Make sure "Places API" is enabled in Google Cloud Console.')
        process.exit(1)
      }

      const places = await collectAllPages(first)
      console.log(`${places.length} places found`)

      for (const place of places) {
        if (seen.has(place.place_id)) { totalSkipped++; continue }
        seen.add(place.place_id)

        await sleep(DELAY_MS)
        const details = await placeDetails(place.place_id)
        const provider = placeToProvider(place, details, categorySlug)
        if (!provider) { totalSkipped++; continue }

        const result = await upsertProvider(provider)
        if (result.ok) {
          totalImported++
          process.stdout.write('✓')
        } else {
          process.stdout.write('.')
        }
      }
      console.log()
    }
  }

  // ── 2. Text searches for grooming + dog walking ──────────────────────────
  for (const { query, categorySlug, label } of TEXT_SEARCHES) {
    process.stdout.write(`Text search: "${query}"... `)
    await sleep(DELAY_MS)

    const first = await placesTextSearch(query)
    const places = await collectAllTextPages(first)
    console.log(`${places.length} places found`)

    for (const place of places) {
      if (seen.has(place.place_id)) { totalSkipped++; continue }
      seen.add(place.place_id)

      await sleep(DELAY_MS)
      const details = await placeDetails(place.place_id)
      const provider = placeToProvider(place, details, categorySlug)
      if (!provider) { totalSkipped++; continue }

      const result = await upsertProvider(provider)
      if (result.ok) {
        totalImported++
        process.stdout.write('✓')
      } else {
        process.stdout.write('.')
      }
    }
    console.log()
  }

  console.log('\n====================================')
  console.log(`✅ Done! Imported: ${totalImported} | Skipped duplicates: ${totalSkipped}`)
  console.log('\nNext steps:')
  console.log('  1. Go to /admin → Approved to review the new listings')
  console.log('  2. Use the 👁 View button to check each one')
  console.log('  3. Mark real, active businesses as ✓ Verified')
  console.log('  4. Friend can WhatsApp them to claim/update their listing')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
