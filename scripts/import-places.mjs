/**
 * import-places.mjs
 *
 * Pulls pet-related businesses from Google Places API across Mumbai
 * and inserts them into the PawLocal providers table.
 *
 * Works with the base schema (migrations 001–003). No extra columns needed.
 *
 * Usage:
 *   cd /Users/melroy/Desktop/pawlocal
 *   node scripts/import-places.mjs
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
  console.error('❌ Could not read .env.local — run this from the project root:\n  cd /Users/melroy/Desktop/pawlocal\n  node scripts/import-places.mjs')
  process.exit(1)
}

const MAPS_KEY = env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!MAPS_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars. Check .env.local.')
  process.exit(1)
}

// ── Config ───────────────────────────────────────────────────────────────────

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

const SEARCH_TYPES = [
  { googleType: 'pet_store',       categorySlug: 'pet-store',  label: 'Pet Store' },
  { googleType: 'veterinary_care', categorySlug: 'vet',        label: 'Vet'       },
]

const TEXT_SEARCHES = [
  { query: 'dog grooming Mumbai',  categorySlug: 'grooming',    label: 'Grooming'    },
  { query: 'pet grooming Mumbai',  categorySlug: 'grooming',    label: 'Grooming'    },
  { query: 'dog walker Mumbai',    categorySlug: 'dog-walking', label: 'Dog Walking' },
]

const SEARCH_RADIUS_M = 5000
const DELAY_MS = 250

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  return res
}

// ── Load existing provider names so we skip duplicates on re-runs ─────────────
async function loadExistingNames() {
  const res = await supabaseFetch('/providers?select=name&status=eq.approved&limit=5000')
  if (!res.ok) {
    const err = await res.text()
    console.error('❌ Could not read existing providers:', err)
    process.exit(1)
  }
  const rows = await res.json()
  // Normalise: lowercase + strip punctuation for fuzzy match
  const names = new Set(rows.map(r => r.name.toLowerCase().replace(/[^a-z0-9]/g, '')))
  console.log(`  Found ${rows.length} existing providers in DB (used for dedup)\n`)
  return names
}

// ── Google Places API helpers ─────────────────────────────────────────────────

async function placesNearby(lat, lng, type, pageToken = null) {
  const p = new URLSearchParams({ location: `${lat},${lng}`, radius: String(SEARCH_RADIUS_M), type, key: MAPS_KEY })
  if (pageToken) p.set('pagetoken', pageToken)
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${p}`)
  return r.json()
}

async function placesText(query, pageToken = null) {
  const p = new URLSearchParams({ query, key: MAPS_KEY })
  if (pageToken) p.set('pagetoken', pageToken)
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${p}`)
  return r.json()
}

async function placeDetails(placeId) {
  const p = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_phone_number,international_phone_number,opening_hours,formatted_address,geometry',
    key: MAPS_KEY,
  })
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${p}`)
  const d = await r.json()
  return d.result ?? {}
}

async function collectPages(firstPage, fetchFn) {
  const results = [...(firstPage.results ?? [])]
  let token = firstPage.next_page_token
  while (token) {
    await sleep(2000) // Google requires delay before next page token is valid
    const page = await fetchFn(token)
    results.push(...(page.results ?? []))
    token = page.next_page_token
  }
  return results
}

// ── Build a provider row using ONLY columns that exist in the base schema ─────
function buildProvider(place, details, categorySlug) {
  const lat = place.geometry?.location?.lat ?? details.geometry?.location?.lat
  const lng = place.geometry?.location?.lng ?? details.geometry?.location?.lng
  if (!lat || !lng) return null

  const rawPhone = details.formatted_phone_number ?? details.international_phone_number ?? ''
  const cleanPhone = rawPhone.replace(/^\+91[\s-]?/, '').replace(/\D/g, '')

  let hoursFrom = '09:00', hoursTo = '20:00'
  const periods = details.opening_hours?.periods
  if (periods?.[0]) {
    const o = periods[0].open?.time, c = periods[0].close?.time
    if (o) hoursFrom = `${o.slice(0, 2)}:${o.slice(2)}`
    if (c) hoursTo   = `${c.slice(0, 2)}:${c.slice(2)}`
  }

  return {
    // ── columns that always exist (migration 001) ──
    name:          place.name,
    business_name: place.name,
    category_slug: categorySlug,
    whatsapp:      cleanPhone || '9999999999',
    phone:         cleanPhone || null,
    lat, lng,
    address:       place.vicinity ?? details.formatted_address ?? 'Mumbai',
    hours_from:    hoursFrom,
    hours_to:      hoursTo,
    working_days:  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    bio:           null,
    status:        'approved',
    // ── migration 003 ──
    is_verified:   false,
  }
}

// ── Insert a single provider (plain INSERT — no on_conflict needed) ───────────
async function insertProvider(provider) {
  const res = await supabaseFetch('/providers', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(provider),
  })
  if (!res.ok) {
    const err = await res.text()
    return { error: err }
  }
  return { ok: true }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🐾 PawLocal — Google Places import')
  console.log('====================================\n')

  // Load existing names FIRST — used to skip duplicates without needing google_place_id column
  const existingNames = await loadExistingNames()

  // Also track place_ids seen this run to avoid inserting the same place twice
  const seenThisRun = new Set()

  let totalImported = 0
  let totalSkipped  = 0

  async function processPlace(place, categorySlug) {
    const normalised = place.name.toLowerCase().replace(/[^a-z0-9]/g, '')

    // Skip if already in DB or already seen this run
    if (existingNames.has(normalised) || seenThisRun.has(place.place_id)) {
      totalSkipped++
      return
    }
    seenThisRun.add(place.place_id)
    existingNames.add(normalised) // prevent double-insert within same run

    await sleep(DELAY_MS)
    const details  = await placeDetails(place.place_id)
    const provider = buildProvider(place, details, categorySlug)
    if (!provider) { totalSkipped++; return }

    const result = await insertProvider(provider)
    if (result.ok) {
      totalImported++
      process.stdout.write('✓')
    } else {
      totalSkipped++
      process.stdout.write('.')
      // Show first error to help diagnose
      if (totalImported === 0 && totalSkipped === 1) {
        console.log('\n  First insert error:', result.error)
      }
    }
  }

  // ── 1. Nearby searches ────────────────────────────────────────────────────
  for (const { googleType, categorySlug, label } of SEARCH_TYPES) {
    for (const centre of SEARCH_CENTRES) {
      process.stdout.write(`Searching ${label} near ${centre.name}... `)
      await sleep(DELAY_MS)

      const first = await placesNearby(centre.lat, centre.lng, googleType)
      if (first.status === 'REQUEST_DENIED' || first.status === 'INVALID_REQUEST') {
        console.log(`\n❌ Google API error: ${first.status} — ${first.error_message}`)
        console.log('Fix: Google Cloud Console → API key → Application restrictions → None')
        process.exit(1)
      }

      const places = await collectPages(first, t => placesNearby(null, null, googleType, t))
      console.log(`${places.length} found`)
      for (const place of places) await processPlace(place, categorySlug)
      console.log()
    }
  }

  // ── 2. Text searches ──────────────────────────────────────────────────────
  for (const { query, categorySlug } of TEXT_SEARCHES) {
    process.stdout.write(`Text search: "${query}"... `)
    await sleep(DELAY_MS)

    const first  = await placesText(query)
    const places = await collectPages(first, t => placesText(query, t))
    console.log(`${places.length} found`)
    for (const place of places) await processPlace(place, categorySlug)
    console.log()
  }

  console.log('====================================')
  console.log(`✅ Done! Imported: ${totalImported} | Skipped: ${totalSkipped}`)
  if (totalImported > 0) {
    console.log('\nNext steps:')
    console.log('  1. Open /map — you should see pins across Mumbai')
    console.log('  2. Go to /admin → Approved to check the listings')
    console.log('  3. Mark legit businesses as ✓ Verified')
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
