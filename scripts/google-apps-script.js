/**
 * PupStep — Google Sheets Real-Time Dashboard
 *
 * SETUP (one time, ~3 minutes):
 * 1. Open your Google Sheet
 * 2. Extensions → Apps Script
 * 3. Paste this entire file, replacing any existing code
 * 4. Click Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Click Deploy → Copy the Web App URL
 * 6. Add to .env.local:  GOOGLE_SHEETS_WEBHOOK_URL=<paste url here>
 * 7. Redeploy your app on Vercel (or restart locally)
 *
 * That's it. PupStep will now push every event here in real time.
 */

const SHEET_NAMES = {
  FEED:        '📊 Live Feed',
  SIGNUPS:     '👤 Signups',
  REPORTS:     '📋 Reports',
  PAYMENTS:    '💰 Payments',
  CONNECTIONS: '📱 Connections',
  WALK_LOGS:   '🦮 Walk Logs',
}

// ── Sheet headers ────────────────────────────────────────────────────────────
const HEADERS = {
  [SHEET_NAMES.FEED]: [
    'Time', 'Event', 'Who', 'Details', 'Amount (₹)', 'Status',
  ],
  [SHEET_NAMES.SIGNUPS]: [
    'Time', 'Name', 'Email', 'Phone', 'Role', 'Source',
  ],
  [SHEET_NAMES.REPORTS]: [
    'Time', 'Type', 'Dog Name', 'Provider', 'Parent Email', 'Duration', 'Report URL', 'Parent Claimed?',
  ],
  [SHEET_NAMES.PAYMENTS]: [
    'Time', 'Parent Email', 'Plan', 'Amount (₹)', 'Razorpay Payment ID', 'Expires On', 'Status',
  ],
  [SHEET_NAMES.CONNECTIONS]: [
    'Time', 'Dog Name', 'Owner ID', 'Walker Name', 'Walker Phone', 'Role', 'OTP', 'Stage',
  ],
  [SHEET_NAMES.WALK_LOGS]: [
    'Time', 'Dog Name', 'Walker Name', 'Started At', 'Duration (mins)', 'Distance (km)', 'Poop 💩', 'Pee 💧', 'Mood', 'Notes',
  ],
}

// ── Brand colors (teal header, alternating rows) ─────────────────────────────
const TEAL   = '#0A2F35'
const AMBER  = '#FF8C52'
const GREEN  = '#D1FAE5'
const YELLOW = '#FEF9C3'
const RED    = '#FFE4E6'
const WHITE  = '#FFFFFF'
const LIGHT  = '#F8FAFB'

// ── Main entry point ──────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents)
    const { event, data, timestamp } = payload
    const time = timestamp ? new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

    switch (event) {
      case 'new_signup':       handleSignup(data, time);      break
      case 'walk_report':      handleReport(data, time, 'Walk');     break
      case 'grooming_report':  handleReport(data, time, 'Grooming'); break
      case 'payment':          handlePayment(data, time);     break
      case 'walker_connection':handleConnection(data, time);  break
      case 'walk_log':         handleWalkLog(data, time);     break
      default:
        appendToFeed(time, event, data.email ?? '', JSON.stringify(data), '', '')
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────
function handleSignup(data, time) {
  appendToSheet(SHEET_NAMES.SIGNUPS, [
    time,
    data.display_name ?? '',
    data.email ?? '',
    data.phone ?? '',
    data.role ?? 'customer',
    data.source ?? 'organic',
  ], GREEN)
  appendToFeed(time, '👤 New Signup', data.email ?? '', `${data.display_name ?? ''} joined as ${data.role ?? 'parent'}`, '', '✓')
}

function handleReport(data, time, type) {
  appendToSheet(SHEET_NAMES.REPORTS, [
    time,
    type,
    data.dog_name ?? '',
    data.provider_name ?? '',
    data.parent_email ?? '',
    data.duration_mins ? `${data.duration_mins} mins` : '',
    data.report_url ?? '',
    data.claimed ? 'Yes ✓' : 'Pending',
  ], LIGHT)
  appendToFeed(time, `📋 ${type} Report`, data.provider_name ?? '', `${data.dog_name ?? 'Dog'} • ${data.duration_mins ?? '?'} mins`, '', data.claimed ? 'Claimed' : 'Awaiting parent')
}

function handlePayment(data, time) {
  const amount = data.amount_paise ? Math.round(data.amount_paise / 100) : ''
  appendToSheet(SHEET_NAMES.PAYMENTS, [
    time,
    data.email ?? '',
    data.plan ?? '',
    amount,
    data.razorpay_payment_id ?? '',
    data.expires_at ?? '',
    data.status ?? 'active',
  ], YELLOW)
  appendToFeed(time, '💰 Payment Received', data.email ?? '', `${data.plan ?? ''} plan`, amount, 'Paid ✓')
  // Highlight payment row in amber
  const sheet = getOrCreateSheet(SHEET_NAMES.PAYMENTS)
  const lastRow = sheet.getLastRow()
  sheet.getRange(lastRow, 1, 1, 7).setBackground(YELLOW).setFontWeight('bold')
}

function handleConnection(data, time) {
  let stage = '1 — QR Generated'
  if (data.status === 'active') stage = '3 — Connected ✓'
  else if (data.otp && !data.claimed_at) stage = '2 — OTP Shared'
  appendToSheet(SHEET_NAMES.CONNECTIONS, [
    time,
    data.dog_name ?? '',
    data.owner_id ?? '',
    data.walker_name ?? '',
    data.walker_phone ?? '',
    data.walker_role ?? 'walker',
    data.otp ?? '',
    stage,
  ], LIGHT)
  appendToFeed(time, '📱 Walker Connection', data.walker_name ?? '', `${data.dog_name ?? 'Dog'} • ${stage}`, '', data.status ?? '')
}

function handleWalkLog(data, time) {
  appendToSheet(SHEET_NAMES.WALK_LOGS, [
    time,
    data.dog_name ?? '',
    data.walker_name ?? '',
    data.started_at ?? '',
    data.duration_mins ?? '',
    data.distance_km ?? '',
    data.poop_count ?? 0,
    data.pee_count ?? 0,
    data.mood ?? '',
    data.notes ?? '',
  ], LIGHT)
  appendToFeed(time, '🦮 Walk Logged', data.walker_name ?? '', `${data.dog_name ?? 'Dog'} • ${data.duration_mins ?? '?'} mins`, '', '✓')
}

// ── Sheet helpers ─────────────────────────────────────────────────────────────
function appendToFeed(time, event, who, details, amount, status) {
  appendToSheet(SHEET_NAMES.FEED, [time, event, who, details, amount, status], LIGHT)
}

function appendToSheet(sheetName, rowData, bgColor) {
  const sheet = getOrCreateSheet(sheetName)
  const nextRow = sheet.getLastRow() + 1
  const range = sheet.getRange(nextRow, 1, 1, rowData.length)
  range.setValues([rowData])
  if (bgColor && nextRow % 2 === 0) range.setBackground(bgColor)
  // Auto-resize columns occasionally
  if (nextRow % 10 === 0) sheet.autoResizeColumns(1, rowData.length)
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    setupSheet(sheet, name)
  }
  return sheet
}

function setupSheet(sheet, name) {
  const headers = HEADERS[name]
  if (!headers) return
  const headerRange = sheet.getRange(1, 1, 1, headers.length)
  headerRange.setValues([headers])
  headerRange.setBackground(TEAL)
  headerRange.setFontColor(WHITE)
  headerRange.setFontWeight('bold')
  headerRange.setFontSize(10)
  sheet.setFrozenRows(1)
  sheet.setRowHeight(1, 28)
  sheet.autoResizeColumns(1, headers.length)
}

// ── One-time setup — run this manually once from Apps Script editor ───────────
function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  // Remove default "Sheet1" if empty
  const defaultSheet = ss.getSheetByName('Sheet1')
  if (defaultSheet && defaultSheet.getLastRow() <= 1) {
    try { ss.deleteSheet(defaultSheet) } catch(e) { /* ignore */ }
  }
  Object.values(SHEET_NAMES).forEach(name => getOrCreateSheet(name))
  SpreadsheetApp.getUi().alert('✅ PupStep sheets created! Deploy this as a Web App to start receiving live data.')
}
