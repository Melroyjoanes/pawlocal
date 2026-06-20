import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { homedir } from 'os'

// ── Load .env.local ──────────────────────────────────────────────────────────
const env = {}
try {
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .forEach(line => {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) env[key.trim()] = rest.join('=').trim()
    })
} catch {
  console.error('❌ Could not read .env.local — run from project root:\n  cd "/Users/melroy/Desktop/desktop dump/pawlocal"\n  node scripts/export-ceo-dashboard.mjs')
  process.exit(1)
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']
const SITE_URL     = env['NEXT_PUBLIC_SITE_URL'] ?? 'https://pupstep.in'
const TRIAL_DAYS   = 14

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Helpers ──────────────────────────────────────────────────────────────────
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
function daysDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}
function trialStatus(trialStartedAt, activeSub) {
  if (activeSub) return 'Paid ✓'
  if (!trialStartedAt) return 'No Trial'
  const trialEnd = new Date(new Date(trialStartedAt).getTime() + TRIAL_DAYS * 86400000)
  const now = new Date()
  if (now < trialEnd) {
    const daysLeft = Math.ceil((trialEnd - now) / 86400000)
    return `In Trial (${daysLeft}d left)`
  }
  return 'Expired 🔴'
}
function actionNeeded(status) {
  if (status === 'Expired 🔴') return 'Follow up'
  if (status.startsWith('In Trial') && status.includes('1d left') || status.includes('2d left') || status.includes('3d left')) return 'Convert soon'
  return ''
}
function colWidths(rows) {
  if (!rows.length) return []
  const headers = rows[0]
  return headers.map((h, i) => {
    const maxLen = Math.min(40, Math.max(
      String(h ?? '').length,
      ...rows.slice(1, 20).map(r => String(r[i] ?? '').length)
    ))
    return { wch: Math.max(maxLen, 10) }
  })
}
function makeSheet(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = colWidths(rows)
  if (rows.length > 0) {
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  }
  return ws
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Fetching data from Supabase...')

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
    db.from('providers').select('id, name, business_name, email, whatsapp, category_slug, status, verification_tier, is_verified, created_at, user_id, neighbourhood').order('created_at', { ascending: false }),
    db.from('walk_reports').select('id, token, provider_id, customer_id, dog_name, walk_date, duration_mins, poop_count, pee_count, distance_meters, photo_url, created_at, providers(name, email)').order('created_at', { ascending: false }).limit(2000),
    db.from('grooming_reports').select('id, token, provider_id, customer_id, dog_name, grooming_date, duration_mins, services_done, ticks_found, before_photo_url, after_photo_url, created_at, providers(name, email)').order('created_at', { ascending: false }).limit(2000),
    db.from('dogs').select('id, owner_id, name, breed, created_at').limit(1000),
    db.from('walker_connections').select('id, token, dog_id, owner_id, walker_name, walker_phone, walker_role, status, otp, qr_generated_at, claimed_at, created_at, dogs(name, breed)').order('created_at', { ascending: false }).limit(500),
    db.from('walk_logs').select('id, connection_id, dog_id, owner_id, walker_name, started_at, ended_at, duration_mins, distance_km, poop_count, pee_count, mood, created_at').order('created_at', { ascending: false }).limit(2000),
    db.from('analytics_events').select('event_type, user_id, user_email, user_name, is_new_user, report_token, invite_token, created_at, metadata').order('created_at', { ascending: false }).limit(200),
  ])

  const authUsers = authRes.data?.users ?? []
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const dateStr = now.toISOString().slice(0, 10)

  // Build lookup maps
  const authById = Object.fromEntries(authUsers.map(u => [u.id, u]))
  const profileById = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const subByUser = Object.fromEntries((subscriptions ?? []).filter(s => s.status === 'active' && new Date(s.expires_at) > now).map(s => [s.user_id, s]))
  const walkReportsByProvider = {}
  for (const r of walkReports ?? []) {
    if (!walkReportsByProvider[r.provider_id]) walkReportsByProvider[r.provider_id] = []
    walkReportsByProvider[r.provider_id].push(r)
  }
  const groomReportsByProvider = {}
  for (const r of groomingReports ?? []) {
    if (!groomReportsByProvider[r.provider_id]) groomReportsByProvider[r.provider_id] = []
    groomReportsByProvider[r.provider_id].push(r)
  }
  const dogById = Object.fromEntries((dogs ?? []).map(d => [d.id, d]))
  const walkLogsByOwner = {}
  for (const l of walkLogs ?? []) {
    if (!walkLogsByOwner[l.owner_id]) walkLogsByOwner[l.owner_id] = []
    walkLogsByOwner[l.owner_id].push(l)
  }
  const dogsByOwner = {}
  for (const d of dogs ?? []) {
    if (!dogsByOwner[d.owner_id]) dogsByOwner[d.owner_id] = []
    dogsByOwner[d.owner_id].push(d)
  }
  const walkReportsByCustomer = {}
  for (const r of walkReports ?? []) {
    if (!r.customer_id) continue
    if (!walkReportsByCustomer[r.customer_id]) walkReportsByCustomer[r.customer_id] = []
    walkReportsByCustomer[r.customer_id].push(r)
  }
  const groomReportsByCustomer = {}
  for (const r of groomingReports ?? []) {
    if (!r.customer_id) continue
    if (!groomReportsByCustomer[r.customer_id]) groomReportsByCustomer[r.customer_id] = []
    groomReportsByCustomer[r.customer_id].push(r)
  }
  const connByOwner = {}
  for (const c of walkerConnections ?? []) {
    if (!connByOwner[c.owner_id]) connByOwner[c.owner_id] = []
    connByOwner[c.owner_id].push(c)
  }

  // ── Revenue KPIs ──────────────────────────────────────────────────────────
  const activeSubs = (subscriptions ?? []).filter(s => s.status === 'active' && new Date(s.expires_at) > now)
  const monthlySubs = activeSubs.filter(s => s.plan === 'monthly')
  const annualSubs  = activeSubs.filter(s => s.plan === 'annual')
  const mrr = monthlySubs.length * 249 + annualSubs.length * Math.round(1999 / 12)
  const arr = mrr * 12
  const totalRevenue = (subscriptions ?? []).reduce((sum, s) => sum + (s.amount_paise ?? 0) / 100, 0)

  const parents = (profiles ?? []).filter(p => p.role === 'customer')
  const noTrial  = parents.filter(p => !p.trial_started_at && !subByUser[p.id])
  const inTrial  = parents.filter(p => {
    if (subByUser[p.id]) return false
    if (!p.trial_started_at) return false
    const end = new Date(new Date(p.trial_started_at).getTime() + TRIAL_DAYS * 86400000)
    return now < end
  })
  const expired  = parents.filter(p => {
    if (subByUser[p.id]) return false
    if (!p.trial_started_at) return false
    const end = new Date(new Date(p.trial_started_at).getTime() + TRIAL_DAYS * 86400000)
    return now >= end
  })
  const paid     = parents.filter(p => !!subByUser[p.id])

  const walkThisMonth = (walkReports ?? []).filter(r => new Date(r.created_at) >= thisMonth)
  const groomThisMonth = (groomingReports ?? []).filter(r => new Date(r.created_at) >= thisMonth)

  // ── Sheet 1: Executive Summary ────────────────────────────────────────────
  const summaryRows = [
    ['PupStep CEO Dashboard', `Generated: ${fmtDT(now.toISOString())}`],
    [],
    ['METRIC', 'VALUE', 'NOTES'],
    ['Total Pet Parents', parents.length, ''],
    ['Total Approved Providers', (providers ?? []).filter(p => p.status === 'approved').length, ''],
    [],
    ['--- TRIAL FUNNEL ---', '', ''],
    ['No Trial Started', noTrial.length, 'Never received a report'],
    ['In Free Trial', inTrial.length, '14-day window active'],
    ['Trial Expired — No Payment 🔴', expired.length, 'Action needed: follow up'],
    ['Paid Monthly (₹249)', monthlySubs.length, ''],
    ['Paid Annual (₹1,999)', annualSubs.length, ''],
    ['Total Paid Subscribers', activeSubs.length, ''],
    [],
    ['--- REVENUE ---', '', ''],
    ['MRR (₹)', mrr, 'Monthly Recurring Revenue'],
    ['ARR (₹)', arr, 'Annual Run Rate'],
    ['Total Revenue Collected (₹)', Math.round(totalRevenue), 'All time'],
    [],
    ['--- ACTIVITY ---', '', ''],
    ['Walk Reports — Total', (walkReports ?? []).length, ''],
    ['Walk Reports — This Month', walkThisMonth.length, ''],
    ['Grooming Reports — Total', (groomingReports ?? []).length, ''],
    ['Grooming Reports — This Month', groomThisMonth.length, ''],
    ['Walk Logs — Total', (walkLogs ?? []).length, ''],
    ['Walk Logs — This Month', (walkLogs ?? []).filter(l => new Date(l.created_at) >= thisMonth).length, ''],
    ['Dogs Registered', (dogs ?? []).length, ''],
    [],
    ['--- OPS PIPELINE ---', '', ''],
    ['Walker Connections — Active', (walkerConnections ?? []).filter(c => c.status === 'active').length, ''],
    ['Walker Connections — Pending (QR not scanned)', (walkerConnections ?? []).filter(c => c.status === 'pending').length, ''],
    ['OTPs Shared Awaiting Scan', (walkerConnections ?? []).filter(c => c.status === 'pending' && c.otp).length, ''],
  ]
  const summarySheet = makeSheet(summaryRows)

  // ── Sheet 2: Pet Parents ──────────────────────────────────────────────────
  const parentHeader = [
    'Parent ID', 'Name', 'Email', 'Phone',
    'Signed Up', 'Last Login',
    'Trial Status', 'Trial Started', 'Trial Ends/Ended',
    'Subscription Plan', 'Amount Paid (₹)', 'Sub Expires',
    'Walk Reports', 'Grooming Reports', 'Dogs Registered',
    'Active Walker Connections', 'Action Needed',
  ]
  const parentRows = parents.map(p => {
    const auth = authById[p.id] ?? {}
    const sub  = subByUser[p.id]
    const ts   = trialStatus(p.trial_started_at, sub)
    const trialEnd = p.trial_started_at ? new Date(new Date(p.trial_started_at).getTime() + TRIAL_DAYS * 86400000) : null
    const action = ts === 'Expired 🔴' ? 'Follow up' :
                   ts.includes('1d') || ts.includes('2d') || ts.includes('3d') ? 'Convert soon' : ''
    return [
      p.id,
      p.display_name ?? '',
      auth.email ?? '',
      p.phone ?? auth.phone ?? '',
      fmt(auth.created_at),
      fmtDT(auth.last_sign_in_at),
      ts,
      fmt(p.trial_started_at),
      trialEnd ? fmt(trialEnd.toISOString()) : '',
      sub?.plan ?? '',
      sub ? Math.round(sub.amount_paise / 100) : '',
      sub ? fmt(sub.expires_at) : '',
      (walkReportsByCustomer[p.id] ?? []).length,
      (groomReportsByCustomer[p.id] ?? []).length,
      (dogsByOwner[p.id] ?? []).length,
      (connByOwner[p.id] ?? []).filter(c => c.status === 'active').length,
      action,
    ]
  })
  // Sort: Follow up first, then Convert soon, then rest
  parentRows.sort((a, b) => {
    const order = { 'Follow up': 0, 'Convert soon': 1, '': 2 }
    return (order[a[16]] ?? 2) - (order[b[16]] ?? 2)
  })
  const parentSheet = makeSheet([parentHeader, ...parentRows])

  // ── Sheet 3: Providers ────────────────────────────────────────────────────
  const provHeader = [
    'Provider ID', 'Name', 'Business Name', 'Email', 'WhatsApp',
    'Category', 'Neighbourhood', 'Verification Tier', 'Status',
    'Joined', 'Walk Reports', 'Grooming Reports', 'Total Reports',
    'Reports This Month', 'Last Report Created', 'Avg Reports/Week',
  ]
  const provRows = (providers ?? []).filter(p => p.status === 'approved').map(p => {
    const wr = walkReportsByProvider[p.id] ?? []
    const gr = groomReportsByProvider[p.id] ?? []
    const allReports = [...wr, ...gr]
    const thisMonthReports = allReports.filter(r => new Date(r.created_at) >= thisMonth)
    const lastReport = allReports.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0]
    const weeksSince = Math.max(1, daysDiff(p.created_at, now.toISOString()) / 7)
    return [
      p.id,
      p.name ?? '',
      p.business_name ?? '',
      p.email ?? '',
      p.whatsapp ?? '',
      p.category_slug ?? '',
      p.neighbourhood ?? '',
      p.verification_tier ?? '',
      p.status ?? '',
      fmt(p.created_at),
      wr.length,
      gr.length,
      allReports.length,
      thisMonthReports.length,
      lastReport ? fmt(lastReport.created_at) : '',
      (allReports.length / weeksSince).toFixed(1),
    ]
  })
  const provSheet = makeSheet([provHeader, ...provRows])

  // ── Sheet 4: Revenue ──────────────────────────────────────────────────────
  const revSummary = [
    ['REVENUE SUMMARY', ''],
    ['Total Revenue Collected (₹)', Math.round(totalRevenue)],
    ['MRR (₹)', mrr],
    ['ARR (₹)', arr],
    ['Active Subscriptions', activeSubs.length],
    ['Expired/Cancelled Subscriptions', (subscriptions ?? []).filter(s => s.status !== 'active' || new Date(s.expires_at) <= now).length],
    [],
  ]
  const revHeader = [
    'Sub ID', 'Email', 'Name', 'Plan', 'Status',
    'Amount (₹)', 'Payment ID', 'Subscribed On', 'Expires On', 'Days Until Expiry', 'Reminder',
  ]
  const revRows = (subscriptions ?? []).map(s => {
    const profile = profileById[s.user_id] ?? {}
    const auth    = authById[s.user_id] ?? {}
    const daysLeft = s.expires_at ? daysDiff(now.toISOString(), s.expires_at) : ''
    const reminder = typeof daysLeft === 'number' && daysLeft > 0 && daysLeft <= 7 ? 'Remind in ' + daysLeft + 'd' : ''
    return [
      s.id,
      auth.email ?? '',
      profile.display_name ?? '',
      s.plan ?? '',
      s.status ?? '',
      Math.round((s.amount_paise ?? 0) / 100),
      s.razorpay_payment_id ?? '',
      fmt(s.created_at),
      fmt(s.expires_at),
      daysLeft,
      reminder,
    ]
  })
  const revSheet = makeSheet([...revSummary, revHeader, ...revRows])

  // ── Sheet 5: Walk Reports ─────────────────────────────────────────────────
  const wrHeader = [
    'Report ID', 'Token', 'Dog Name', 'Provider Name', 'Provider Email',
    'Parent ID', 'Walk Date', 'Duration (mins)', 'Distance (m)',
    'Poop 💩', 'Pee 💧', 'Has Photo', 'Created At', 'Claimed by Parent', 'Report URL',
  ]
  const wrRows = (walkReports ?? []).map(r => [
    r.id,
    (r.token ?? '').slice(0, 12),
    r.dog_name ?? '',
    r.providers?.name ?? '',
    r.providers?.email ?? '',
    r.customer_id ?? '',
    fmt(r.walk_date),
    r.duration_mins ?? '',
    r.distance_meters ?? '',
    r.poop_count ?? 0,
    r.pee_count ?? 0,
    r.photo_url ? 'Yes' : 'No',
    fmtDT(r.created_at),
    r.customer_id ? 'Yes ✓' : 'No',
    `${SITE_URL}/walk-report/${r.token}`,
  ])
  const wrSheet = makeSheet([wrHeader, ...wrRows])

  // ── Sheet 6: Grooming Reports ─────────────────────────────────────────────
  const grHeader = [
    'Report ID', 'Token', 'Dog Name', 'Provider Name', 'Provider Email',
    'Parent ID', 'Grooming Date', 'Duration (mins)', 'Services Done',
    'Ticks Found', 'Before Photo', 'After Photo', 'Created At', 'Claimed by Parent', 'Report URL',
  ]
  const grRows = (groomingReports ?? []).map(r => [
    r.id,
    (r.token ?? '').slice(0, 12),
    r.dog_name ?? '',
    r.providers?.name ?? '',
    r.providers?.email ?? '',
    r.customer_id ?? '',
    fmt(r.grooming_date),
    r.duration_mins ?? '',
    Array.isArray(r.services_done) ? r.services_done.join(', ') : '',
    r.ticks_found ?? 0,
    r.before_photo_url ? 'Yes' : 'No',
    r.after_photo_url ? 'Yes' : 'No',
    fmtDT(r.created_at),
    r.customer_id ? 'Yes ✓' : 'No',
    `${SITE_URL}/grooming-report/${r.token}`,
  ])
  const grSheet = makeSheet([grHeader, ...grRows])

  // ── Sheet 7: QR & OTP Pipeline ────────────────────────────────────────────
  const otpHeader = [
    'Connection ID', 'Stage', 'Dog Name', 'Dog Breed', 'Owner ID',
    'Walker Name', 'Walker Phone', 'Walker Role',
    'QR Generated', 'OTP Code', 'OTP Status', 'Connected At',
    'Connection Status', 'Total Walk Logs', 'Last Walk', 'Action',
  ]
  const otpRows = (walkerConnections ?? []).map(c => {
    const dog = c.dogs ?? dogById[c.dog_id] ?? {}
    const logs = (walkLogs ?? []).filter(l => l.connection_id === c.id)
    const lastLog = logs[0]
    let stage, otpStatus, action
    if (c.status === 'revoked') {
      stage = '4 — Revoked'; otpStatus = 'Revoked'; action = 'Revoked'
    } else if (c.status === 'active') {
      stage = '3 — Connected'; otpStatus = 'Connected ✓'; action = 'Active ✓'
    } else if (c.otp && !c.claimed_at) {
      stage = '2 — OTP Sent'
      otpStatus = 'Awaiting QR Scan'
      const minsAgo = Math.round((now - new Date(c.qr_generated_at ?? c.created_at)) / 60000)
      action = minsAgo > 30 ? 'Follow up — OTP not scanned' : 'Sent recently'
    } else {
      stage = '1 — QR Generated'; otpStatus = 'OTP Pending'; action = 'Set OTP & share'
    }
    if (c.status === 'pending' && !c.otp) {
      const daysAgo = daysDiff(c.created_at, now.toISOString())
      if (daysAgo > 7) action = `Follow up — QR not scanned (${daysAgo}d ago)`
    }
    return [
      c.id,
      stage,
      dog.name ?? '',
      dog.breed ?? '',
      c.owner_id ?? '',
      c.walker_name ?? '',
      c.walker_phone ?? '',
      c.walker_role ?? '',
      fmtDT(c.qr_generated_at ?? c.created_at),
      c.otp ?? '',
      otpStatus,
      fmtDT(c.claimed_at),
      c.status ?? '',
      logs.length,
      lastLog ? fmt(lastLog.started_at) : '',
      action,
    ]
  })
  const otpSheet = makeSheet([otpHeader, ...otpRows])

  // ── Sheet 8: Analytics Events ─────────────────────────────────────────────
  const analyticsHeader = [
    'Event Type', 'User Email', 'User Name', 'New User?',
    'Report Token', 'Invite Token', 'Date/Time', 'Metadata',
  ]
  const analyticsRows = (analyticsEvents ?? []).map(e => [
    e.event_type ?? '',
    e.user_email ?? '',
    e.user_name ?? '',
    e.is_new_user ? 'Yes' : 'No',
    e.report_token ?? '',
    e.invite_token ?? '',
    fmtDT(e.created_at),
    e.metadata ? JSON.stringify(e.metadata) : '',
  ])
  const analyticsSheet = makeSheet([analyticsHeader, ...analyticsRows])

  // ── Build Workbook ────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, summarySheet,   '📊 Summary')
  XLSX.utils.book_append_sheet(wb, parentSheet,    '👨‍👩‍👧 Pet Parents')
  XLSX.utils.book_append_sheet(wb, provSheet,      '🐕 Providers')
  XLSX.utils.book_append_sheet(wb, revSheet,       '💰 Revenue')
  XLSX.utils.book_append_sheet(wb, wrSheet,        '🦮 Walk Reports')
  XLSX.utils.book_append_sheet(wb, grSheet,        '✂️ Grooming Reports')
  XLSX.utils.book_append_sheet(wb, otpSheet,       '📱 QR & OTP Pipeline')
  XLSX.utils.book_append_sheet(wb, analyticsSheet, '📈 Activity Log')

  // ── Save ──────────────────────────────────────────────────────────────────
  const outPath = resolve(homedir(), 'Desktop', `PupStep_CEO_Dashboard_${dateStr}.xlsx`)
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
  writeFileSync(outPath, buf)

  console.log('\n━'.repeat(50))
  console.log('✅ CEO Dashboard exported!')
  console.log(`📂 Saved to: ${outPath}`)
  console.log('━'.repeat(50))
  console.log(`👨‍👩‍👧 Pet Parents:      ${parents.length} (${paid.length} paid, ${inTrial.length} in trial, ${expired.length} expired)`)
  console.log(`🐕 Providers:       ${(providers ?? []).filter(p => p.status === 'approved').length} approved`)
  console.log(`💰 MRR:             ₹${mrr}`)
  console.log(`📊 Revenue (all):   ₹${Math.round(totalRevenue)}`)
  console.log(`🦮 Walk Reports:    ${(walkReports ?? []).length}`)
  console.log(`✂️  Grooming Reports: ${(groomingReports ?? []).length}`)
  console.log(`📱 Connections:     ${(walkerConnections ?? []).length} total`)
  console.log('━'.repeat(50))
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1) })
