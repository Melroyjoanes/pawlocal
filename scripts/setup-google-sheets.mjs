/**
 * PupStep — Google Sheets One-Time Setup + Data Sync
 *
 * FIRST TIME ONLY (2 minutes):
 * 1. Go to https://console.cloud.google.com
 * 2. Select/create a project → APIs & Services → Enable APIs → search "Google Sheets API" → Enable
 * 3. APIs & Services → Credentials → + Create Credentials → OAuth client ID
 *    → Application type: Desktop app → Name: PupStep → Create → Download JSON
 * 4. Rename the downloaded file to "google-credentials.json"
 * 5. Move it to:  /Users/melroy/Desktop/desktop dump/pawlocal/scripts/google-credentials.json
 * 6. Run:  node scripts/setup-google-sheets.mjs
 *    → A browser tab opens → Click "Allow" → Done forever
 *
 * After first run, token is saved automatically. Run anytime to re-sync all data.
 */

import { google } from 'googleapis'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createServer } from 'http'
import { open } from 'child_process'

// ── Config ────────────────────────────────────────────────────────────────────
const SHEET_ID   = '1g0Wnd80LRCfA-MjY4m-Y6IEaqba9_q43tnwE8YrHOFg'
const SCRIPTS    = resolve(process.cwd(), 'scripts')
const CREDS_FILE = resolve(SCRIPTS, 'google-credentials.json')
const TOKEN_FILE = resolve(SCRIPTS, 'google-token.json')
const SCOPES     = ['https://www.googleapis.com/auth/spreadsheets']
const TRIAL_DAYS = 14

// ── Load env ──────────────────────────────────────────────────────────────────
const env = {}
try {
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').forEach(line => {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) env[key.trim()] = rest.join('=').trim()
    })
} catch { console.error('❌ Could not read .env.local'); process.exit(1) }

const SITE_URL = env['NEXT_PUBLIC_SITE_URL'] ?? 'https://pupstep.in'

// ── Google Auth ───────────────────────────────────────────────────────────────
async function getAuth() {
  if (!existsSync(CREDS_FILE)) {
    console.error(`
❌ google-credentials.json not found.

2-minute setup:
1. Go to https://console.cloud.google.com
2. APIs & Services → Enable APIs → "Google Sheets API" → Enable
3. Credentials → + Create Credentials → OAuth client ID → Desktop app → Download JSON
4. Rename to google-credentials.json → move to: ${CREDS_FILE}
5. Re-run this script
`)
    process.exit(1)
  }

  const creds = JSON.parse(readFileSync(CREDS_FILE, 'utf8'))
  const { client_id, client_secret, redirect_uris } = creds.installed ?? creds.web
  const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3737/oauth2callback')

  if (existsSync(TOKEN_FILE)) {
    auth.setCredentials(JSON.parse(readFileSync(TOKEN_FILE, 'utf8')))
    console.log('✓ Using saved Google credentials')
    return auth
  }

  // First-time OAuth flow
  const authUrl = auth.generateAuthUrl({ access_type: 'offline', scope: SCOPES })
  console.log('\n🔐 Opening browser for Google authorization...')
  console.log('   (If browser does not open, visit this URL manually:)')
  console.log('  ', authUrl, '\n')

  try { open(authUrl, 'open') } catch { /* ignore */ }

  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:3737')
      const code = url.searchParams.get('code')
      res.end('<html><body style="font-family:sans-serif;padding:40px"><h2>✅ Authorized! You can close this tab.</h2><p>PupStep is now connected to Google Sheets.</p></body></html>')
      server.close()
      if (code) resolve(code); else reject(new Error('No code'))
    }).listen(3737)
    console.log('⏳ Waiting for authorization (check your browser)...')
  })

  const { tokens } = await auth.getToken(code)
  auth.setCredentials(tokens)
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2))
  console.log('✓ Credentials saved to', TOKEN_FILE)
  return auth
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TEAL   = { red: 0.04, green: 0.18, blue: 0.21 }  // #0A2F35
const AMBER  = { red: 1,    green: 0.55, blue: 0.32 }  // #FF8C52
const WHITE  = { red: 1,    green: 1,    blue: 1    }
const LIGHT  = { red: 0.97, green: 0.98, blue: 0.98 }
const YELLOW = { red: 1,    green: 0.98, blue: 0.76 }
const RED    = { red: 1,    green: 0.89, blue: 0.90 }
const GREEN  = { red: 0.82, green: 0.98, blue: 0.90 }

function fmt(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`
}
function fmtDT(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${fmt(d)} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
}
function trialStatus(trialStartedAt, activeSub) {
  if (activeSub) return 'Paid ✓'
  if (!trialStartedAt) return 'No Trial'
  const end = new Date(new Date(trialStartedAt).getTime() + TRIAL_DAYS * 86400000)
  const now = new Date()
  if (now < end) return `In Trial (${Math.ceil((end - now) / 86400000)}d left)`
  return 'Expired 🔴'
}

// ── Sheet builder helpers ─────────────────────────────────────────────────────
function headerRow(cols) {
  return {
    values: cols.map(v => ({
      userEnteredValue: { stringValue: v },
      userEnteredFormat: {
        backgroundColor: TEAL,
        textFormat: { bold: true, foregroundColor: WHITE, fontSize: 10 },
        verticalAlignment: 'MIDDLE',
        horizontalAlignment: 'CENTER',
        wrapStrategy: 'CLIP',
      }
    }))
  }
}
function dataRow(cells, bgColor) {
  return {
    values: cells.map(v => ({
      userEnteredValue: v === null || v === undefined || v === ''
        ? { stringValue: '' }
        : typeof v === 'number'
          ? { numberValue: v }
          : { stringValue: String(v) },
      userEnteredFormat: bgColor ? { backgroundColor: bgColor } : {},
    }))
  }
}
function freezeAndResize(sheetId, colCount) {
  return [
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
    { autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: colCount } } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 30 }, fields: 'pixelSize' } },
  ]
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const auth = await getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // ── Load Supabase data ────────────────────────────────────────────────────
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

  console.log('\n🔄 Fetching data from Supabase...')
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    authRes,
    { data: profiles },
    { data: subscriptions },
    { data: providers },
    { data: walkReports },
    { data: groomingReports },
    { data: dogs },
    { data: walkerConnections },
    { data: walkLogs },
    { data: analyticsEvents },
  ] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from('profiles').select('id, role, display_name, phone, trial_started_at'),
    db.from('subscriptions').select('id, user_id, plan, status, amount_paise, expires_at, razorpay_payment_id, created_at').order('created_at', { ascending: false }),
    db.from('providers').select('id, name, business_name, email, whatsapp, category_slug, status, verification_tier, is_verified, created_at, neighbourhood').order('created_at', { ascending: false }),
    db.from('walk_reports').select('id, token, provider_id, customer_id, dog_name, walk_date, duration_mins, poop_count, pee_count, distance_meters, photo_url, created_at, providers(name,email)').order('created_at', { ascending: false }).limit(2000),
    db.from('grooming_reports').select('id, token, provider_id, customer_id, dog_name, grooming_date, duration_mins, services_done, ticks_found, before_photo_url, after_photo_url, created_at, providers(name,email)').order('created_at', { ascending: false }).limit(2000),
    db.from('dogs').select('id, owner_id, name, breed, created_at').limit(1000),
    db.from('walker_connections').select('id, token, dog_id, owner_id, walker_name, walker_phone, walker_role, status, otp, qr_generated_at, claimed_at, created_at, dogs(name,breed)').order('created_at', { ascending: false }).limit(500),
    db.from('walk_logs').select('id, connection_id, dog_id, owner_id, walker_name, started_at, ended_at, duration_mins, distance_km, poop_count, pee_count, mood, created_at').order('created_at', { ascending: false }).limit(2000),
    db.from('analytics_events').select('event_type, user_id, user_email, user_name, is_new_user, report_token, invite_token, created_at, metadata').order('created_at', { ascending: false }).limit(500),
  ])

  const authUsers = authRes.data?.users ?? []
  const authById  = Object.fromEntries(authUsers.map(u => [u.id, u]))
  const profById  = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const subByUser = Object.fromEntries((subscriptions ?? []).filter(s => s.status === 'active' && new Date(s.expires_at) > now).map(s => [s.user_id, s]))
  const dogById   = Object.fromEntries((dogs ?? []).map(d => [d.id, d]))
  const wrByProv  = {}; for (const r of walkReports ?? []) { (wrByProv[r.provider_id] ??= []).push(r) }
  const grByProv  = {}; for (const r of groomingReports ?? []) { (grByProv[r.provider_id] ??= []).push(r) }
  const wrByCust  = {}; for (const r of walkReports ?? []) { if (r.customer_id) (wrByCust[r.customer_id] ??= []).push(r) }
  const grByCust  = {}; for (const r of groomingReports ?? []) { if (r.customer_id) (grByCust[r.customer_id] ??= []).push(r) }
  const dogByOwn  = {}; for (const d of dogs ?? []) { (dogByOwn[d.owner_id] ??= []).push(d) }
  const connByOwn = {}; for (const c of walkerConnections ?? []) { (connByOwn[c.owner_id] ??= []).push(c) }
  const logsByConn= {}; for (const l of walkLogs ?? []) { (logsByConn[l.connection_id] ??= []).push(l) }

  const activeSubs  = (subscriptions ?? []).filter(s => s.status === 'active' && new Date(s.expires_at) > now)
  const monthlySubs = activeSubs.filter(s => s.plan === 'monthly')
  const annualSubs  = activeSubs.filter(s => s.plan === 'annual')
  const mrr = monthlySubs.length * 249 + annualSubs.length * Math.round(1999/12)
  const totalRevenue = (subscriptions ?? []).reduce((s, r) => s + (r.amount_paise ?? 0)/100, 0)
  const parents = (profiles ?? []).filter(p => p.role === 'customer')
  const noTrial = parents.filter(p => !p.trial_started_at && !subByUser[p.id])
  const inTrial = parents.filter(p => { if (subByUser[p.id] || !p.trial_started_at) return false; return new Date() < new Date(new Date(p.trial_started_at).getTime() + TRIAL_DAYS*86400000) })
  const expired = parents.filter(p => { if (subByUser[p.id] || !p.trial_started_at) return false; return new Date() >= new Date(new Date(p.trial_started_at).getTime() + TRIAL_DAYS*86400000) })

  // ── Get existing sheet metadata ───────────────────────────────────────────
  console.log('📊 Reading spreadsheet structure...')
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const existingSheets = meta.data.sheets ?? []
  const existingNames  = existingSheets.map(s => s.properties.title)

  const TABS = [
    '📊 Summary',
    '👨‍👩‍👧 Pet Parents',
    '🐕 Providers',
    '💰 Revenue',
    '🦮 Walk Reports',
    '✂️ Grooming Reports',
    '📱 QR & OTP Pipeline',
    '📈 Activity Log',
    '🔴 Live Feed',
  ]

  // Add missing sheets
  const addRequests = TABS.filter(t => !existingNames.includes(t)).map(title => ({
    addSheet: { properties: { title } }
  }))
  if (addRequests.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests: addRequests } })
    console.log(`✓ Created ${addRequests.length} new tab(s)`)
  }

  // Re-fetch after creating sheets
  const meta2 = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const sheetIdMap = Object.fromEntries(meta2.data.sheets.map(s => [s.properties.title, s.properties.sheetId]))

  // ── Build and write each tab ──────────────────────────────────────────────
  async function writeTab(tabName, headerCols, dataRows, rowColors) {
    const sid = sheetIdMap[tabName]
    if (sid === undefined) return

    const allRows = [headerRow(headerCols), ...dataRows.map((r, i) => dataRow(r, rowColors?.[i]))]

    // Clear old data first
    await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `'${tabName}'!A:ZZ` })

    // Write rows
    if (allRows.length > 1) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [
            {
              updateCells: {
                range: { sheetId: sid, startRowIndex: 0, startColumnIndex: 0 },
                rows: allRows,
                fields: 'userEnteredValue,userEnteredFormat',
              }
            },
            ...freezeAndResize(sid, headerCols.length),
          ]
        }
      })
    } else {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests: freezeAndResize(sid, headerCols.length) } })
    }
    console.log(`  ✓ ${tabName} (${dataRows.length} rows)`)
  }

  console.log('\n📝 Writing data to Google Sheets...')

  // ── Tab 1: Summary ──────────────────────────────────────────────────────
  await writeTab('📊 Summary',
    ['Metric', 'Value', 'Notes'],
    [
      ['Report Generated', fmtDT(now.toISOString()), ''],
      ['', '', ''],
      ['━━ USERS ━━', '', ''],
      ['Total Pet Parents', parents.length, ''],
      ['Total Approved Providers', (providers ?? []).filter(p => p.status === 'approved').length, ''],
      ['', '', ''],
      ['━━ TRIAL FUNNEL ━━', '', ''],
      ['No Trial Started', noTrial.length, 'Never received a report'],
      ['In Free Trial', inTrial.length, '14-day window active'],
      ['Trial Expired — No Payment 🔴', expired.length, 'Follow up immediately'],
      ['Paid Monthly (₹249/mo)', monthlySubs.length, ''],
      ['Paid Annual (₹1,999/yr)', annualSubs.length, ''],
      ['Total Paid Subscribers', activeSubs.length, ''],
      ['', '', ''],
      ['━━ REVENUE ━━', '', ''],
      ['MRR (₹)', mrr, 'Monthly Recurring Revenue'],
      ['ARR (₹)', mrr * 12, 'Annualised'],
      ['Total Revenue Collected (₹)', Math.round(totalRevenue), 'All time'],
      ['', '', ''],
      ['━━ CONTENT ━━', '', ''],
      ['Walk Reports Total', (walkReports ?? []).length, ''],
      ['Walk Reports This Month', (walkReports ?? []).filter(r => new Date(r.created_at) >= thisMonth).length, ''],
      ['Grooming Reports Total', (groomingReports ?? []).length, ''],
      ['Walk Logs Total', (walkLogs ?? []).length, ''],
      ['Dogs Registered', (dogs ?? []).length, ''],
      ['', '', ''],
      ['━━ OPS PIPELINE ━━', '', ''],
      ['Walker Connections Active', (walkerConnections ?? []).filter(c => c.status === 'active').length, ''],
      ['Walker Connections Pending', (walkerConnections ?? []).filter(c => c.status === 'pending').length, ''],
      ['OTPs Awaiting Scan', (walkerConnections ?? []).filter(c => c.status === 'pending' && c.otp).length, ''],
    ],
    null
  )

  // ── Tab 2: Pet Parents ────────────────────────────────────────────────────
  const parentRows = parents.map(p => {
    const au  = authById[p.id] ?? {}
    const sub = subByUser[p.id]
    const ts  = trialStatus(p.trial_started_at, sub)
    const trialEnd = p.trial_started_at ? new Date(new Date(p.trial_started_at).getTime() + TRIAL_DAYS*86400000) : null
    const action = ts === 'Expired 🔴' ? 'Follow up 🔴' : ts.includes('1d') || ts.includes('2d') || ts.includes('3d') ? 'Convert soon ⚠️' : ''
    return [p.id, p.display_name ?? '', au.email ?? '', p.phone ?? au.phone ?? '', fmt(au.created_at), fmtDT(au.last_sign_in_at), ts, fmt(p.trial_started_at), trialEnd ? fmt(trialEnd.toISOString()) : '', sub?.plan ?? '', sub ? Math.round(sub.amount_paise/100) : '', sub ? fmt(sub.expires_at) : '', (wrByCust[p.id] ?? []).length, (grByCust[p.id] ?? []).length, (dogByOwn[p.id] ?? []).length, (connByOwn[p.id] ?? []).filter(c => c.status === 'active').length, action]
  }).sort((a, b) => { const o = {'Follow up 🔴':0,'Convert soon ⚠️':1,'':2}; return (o[a[16]]??2)-(o[b[16]]??2) })

  await writeTab('👨‍👩‍👧 Pet Parents',
    ['Parent ID','Name','Email','Phone','Signed Up','Last Login','Trial Status','Trial Started','Trial Ends','Plan','Amount Paid (₹)','Sub Expires','Walk Reports','Grooming Reports','Dogs','Active Walker Connections','Action'],
    parentRows,
    parentRows.map(r => r[16] === 'Follow up 🔴' ? RED : r[16] === 'Convert soon ⚠️' ? YELLOW : null)
  )

  // ── Tab 3: Providers ──────────────────────────────────────────────────────
  const provRows = (providers ?? []).filter(p => p.status === 'approved').map(p => {
    const all = [...(wrByProv[p.id] ?? []), ...(grByProv[p.id] ?? [])]
    const last = all.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0]
    const weeks = Math.max(1, (now - new Date(p.created_at)) / (7*86400000))
    return [p.id, p.name ?? '', p.business_name ?? '', p.email ?? '', p.whatsapp ?? '', p.category_slug ?? '', p.neighbourhood ?? '', p.verification_tier ?? '', fmt(p.created_at), (wrByProv[p.id] ?? []).length, (grByProv[p.id] ?? []).length, all.length, all.filter(r => new Date(r.created_at) >= thisMonth).length, last ? fmt(last.created_at) : '', (all.length/weeks).toFixed(1)]
  })
  await writeTab('🐕 Providers',
    ['Provider ID','Name','Business Name','Email','WhatsApp','Category','Neighbourhood','Verification','Joined','Walk Reports','Grooming Reports','Total Reports','This Month','Last Report','Avg/Week'],
    provRows, null
  )

  // ── Tab 4: Revenue ────────────────────────────────────────────────────────
  const revRows = (subscriptions ?? []).map(s => {
    const prof = profById[s.user_id] ?? {}
    const au   = authById[s.user_id] ?? {}
    const dl   = s.expires_at ? Math.round((new Date(s.expires_at)-now)/86400000) : ''
    return [s.id, au.email ?? '', prof.display_name ?? '', s.plan ?? '', s.status ?? '', Math.round((s.amount_paise ?? 0)/100), s.razorpay_payment_id ?? '', fmt(s.created_at), fmt(s.expires_at), dl, typeof dl === 'number' && dl > 0 && dl <= 7 ? `Remind in ${dl}d` : '']
  })
  await writeTab('💰 Revenue',
    ['Sub ID','Email','Name','Plan','Status','Amount (₹)','Razorpay Payment ID','Subscribed On','Expires On','Days Left','Reminder'],
    revRows, null
  )

  // ── Tab 5: Walk Reports ───────────────────────────────────────────────────
  await writeTab('🦮 Walk Reports',
    ['Report ID','Token','Dog Name','Provider','Provider Email','Parent ID','Walk Date','Duration (mins)','Distance (m)','Poop 💩','Pee 💧','Has Photo','Created At','Claimed','Report URL'],
    (walkReports ?? []).map(r => [r.id, (r.token??'').slice(0,12), r.dog_name??'', r.providers?.name??'', r.providers?.email??'', r.customer_id??'', fmt(r.walk_date), r.duration_mins??'', r.distance_meters??'', r.poop_count??0, r.pee_count??0, r.photo_url?'Yes':'No', fmtDT(r.created_at), r.customer_id?'Yes ✓':'No', `${SITE_URL}/walk-report/${r.token}`]),
    null
  )

  // ── Tab 6: Grooming Reports ───────────────────────────────────────────────
  await writeTab('✂️ Grooming Reports',
    ['Report ID','Token','Dog Name','Provider','Provider Email','Parent ID','Grooming Date','Duration','Services','Ticks','Before Photo','After Photo','Created At','Claimed','Report URL'],
    (groomingReports ?? []).map(r => [r.id, (r.token??'').slice(0,12), r.dog_name??'', r.providers?.name??'', r.providers?.email??'', r.customer_id??'', fmt(r.grooming_date), r.duration_mins??'', Array.isArray(r.services_done)?r.services_done.join(', '):'', r.ticks_found??0, r.before_photo_url?'Yes':'No', r.after_photo_url?'Yes':'No', fmtDT(r.created_at), r.customer_id?'Yes ✓':'No', `${SITE_URL}/grooming-report/${r.token}`]),
    null
  )

  // ── Tab 7: QR & OTP Pipeline ─────────────────────────────────────────────
  const otpRows = (walkerConnections ?? []).map(c => {
    const dog = c.dogs ?? dogById[c.dog_id] ?? {}
    const logs = logsByConn[c.id] ?? []
    let stage, action
    if (c.status === 'revoked') { stage = '4 — Revoked'; action = 'Revoked' }
    else if (c.status === 'active') { stage = '3 — Connected ✓'; action = 'Active ✓' }
    else if (c.otp && !c.claimed_at) { const m = Math.round((now - new Date(c.qr_generated_at??c.created_at))/60000); stage = '2 — OTP Sent'; action = m > 30 ? 'Follow up — not scanned' : 'Sent recently' }
    else { const d = Math.round((now-new Date(c.created_at))/86400000); stage = '1 — QR Generated'; action = d > 7 ? `Follow up (${d}d ago)` : 'Pending' }
    const last = logs[0]
    return [c.id, stage, dog.name??'', dog.breed??'', c.owner_id??'', c.walker_name??'', c.walker_phone??'', c.walker_role??'', fmtDT(c.qr_generated_at??c.created_at), c.otp??'', c.status??'', fmtDT(c.claimed_at), logs.length, last?fmt(last.started_at):'', action]
  })
  await writeTab('📱 QR & OTP Pipeline',
    ['Connection ID','Stage','Dog Name','Breed','Owner ID','Walker Name','Walker Phone','Role','QR Generated','OTP Code','Status','Connected At','Total Walks','Last Walk','Action'],
    otpRows,
    otpRows.map(r => r[1].startsWith('3') ? GREEN : r[14].includes('Follow') ? RED : null)
  )

  // ── Tab 8: Activity Log ───────────────────────────────────────────────────
  await writeTab('📈 Activity Log',
    ['Event Type','User Email','User Name','New User?','Report Token','Invite Token','Date/Time','Metadata'],
    (analyticsEvents ?? []).map(e => [e.event_type??'', e.user_email??'', e.user_name??'', e.is_new_user?'Yes':'No', e.report_token??'', e.invite_token??'', fmtDT(e.created_at), e.metadata?JSON.stringify(e.metadata):''])
  )

  // ── Tab 9: Live Feed (starts empty, filled by webhooks) ───────────────────
  await writeTab('🔴 Live Feed',
    ['Time (IST)', 'Event', 'Who', 'Details', 'Amount (₹)', 'Status'],
    [],
    null
  )

  // ── Final formatting: rename/reorder tabs ─────────────────────────────────
  const meta3 = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const finalSheets = meta3.data.sheets ?? []
  const tabOrder = TABS.map(t => finalSheets.find(s => s.properties.title === t)?.properties?.sheetId).filter(id => id !== undefined)

  if (tabOrder.length > 1) {
    const reorderReqs = tabOrder.map((sheetId, idx) => ({
      updateSheetProperties: { properties: { sheetId, index: idx }, fields: 'index' }
    }))
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests: reorderReqs } })
  }

  // Update spreadsheet title
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{ updateSpreadsheetProperties: { properties: { title: 'PupStep — CEO Dashboard' }, fields: 'title' } }] }
  })

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Google Sheet fully set up and populated!
📊 https://docs.google.com/spreadsheets/d/${SHEET_ID}

Summary:
  👨‍👩‍👧 Pet Parents:  ${parents.length} (${activeSubs.length} paid, ${inTrial.length} in trial, ${expired.length} expired)
  🐕 Providers:    ${(providers??[]).filter(p=>p.status==='approved').length} approved
  💰 MRR:          ₹${mrr}
  🦮 Walk Reports: ${(walkReports??[]).length}
  📱 Connections:  ${(walkerConnections??[]).length}

Next: Set GOOGLE_SHEETS_WEBHOOK_URL in .env.local to push
real-time events. See README in scripts/google-apps-script.js.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

main().catch(e => { console.error('❌', e.message ?? e); process.exit(1) })
