import { randomBytes } from 'crypto'
import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getEntitlement } from '@/lib/entitlement'
import { sendGA4Event } from '@/lib/ga4'
import { assessWalkPlausibility } from '@/lib/walkValidation'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Dog parent logging a walk with their own dog — no walker, no walker_connections
// row at all. Deliberately a separate function with its own auth, own DB writes,
// and an early return, rather than threading a branch through the 300-line
// walker path below — that path is live/load-bearing and none of its logic
// (trial-start counting, WhatsApp-to-owner links, walker total_walks increment)
// applies here. Self-walk reports are always free to view (see the isSelfWalk
// carve-out in app/walk-report/[token]/page.tsx) and never start/consume the
// trial, so there is intentionally no entitlement gating or email/WhatsApp
// delivery in this path — the parent is already looking at the result.
async function handleSelfWalk(req: NextRequest, body: Record<string, unknown>) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dogId = body.dog_id as string | undefined
  if (!dogId) return NextResponse.json({ error: 'dog_id is required' }, { status: 400 })

  const {
    duration_mins, poop_count, pee_count, mood, notes,
    distance_km, started_at, ended_at, gps_route, photo_url, walk_events,
  } = body as {
    duration_mins?: number; poop_count?: number; pee_count?: number; mood?: string; notes?: string
    distance_km?: number; started_at?: string; ended_at?: string; gps_route?: unknown; photo_url?: string
    walk_events?: Array<{ type: 'pee' | 'poop'; lat: number | null; lng: number | null; ts: string; photoUrl?: string | null }>
  }

  const db = admin()

  // Ownership check — a parent can only self-log a walk for their own dog
  const { data: dog, error: dogError } = await (db.from('dogs') as any)
    .select('id, name')
    .eq('id', dogId)
    .eq('owner_id', user.id)
    .single()

  if (dogError || !dog) {
    return NextResponse.json({ error: 'Dog not found' }, { status: 404 })
  }

  const { data: log, error: insertError } = await (db.from('walk_logs') as any)
    .insert({
      connection_id: null,
      dog_id: dogId,
      owner_id: user.id,
      walker_name: null,
      logged_by: 'parent',
      duration_mins: duration_mins ?? null,
      poop_count: poop_count ?? 0,
      pee_count: pee_count ?? 0,
      mood: mood ?? null,
      notes: notes ?? null,
      distance_km: distance_km ?? null,
      started_at: started_at ?? new Date().toISOString(),
      ended_at: ended_at ?? null,
      gps_route: gps_route ?? null,
      photo_url: photo_url ?? null,
    })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  type WalkEvent = { type: 'pee' | 'poop'; lat: number | null; lng: number | null; ts: string; photoUrl?: string | null }
  const events: WalkEvent[] = Array.isArray(walk_events) ? walk_events : []
  const poopEvents = events
    .filter((e) => e.type === 'poop' && e.lat != null && e.lng != null)
    .map((e) => ({ lat: e.lat!, lng: e.lng!, time: e.ts, photo_url: e.photoUrl ?? null }))
  const peeEvents = events
    .filter((e) => e.type === 'pee' && e.lat != null && e.lng != null)
    .map((e) => ({ lat: e.lat!, lng: e.lng!, time: e.ts }))

  const finalPoopCount = poopEvents.length > 0 ? poopEvents.length : (poop_count ?? 0)
  const finalPeeCount = peeEvents.length > 0 ? peeEvents.length : (pee_count ?? 0)

  const gpsPoints = Array.isArray(gps_route) ? gps_route.length : 0
  const qualityScore =
    (gpsPoints >= 5 ? 30 : gpsPoints > 0 ? 15 : 0) +
    (photo_url ? 25 : 0) +
    (poopEvents.length + peeEvents.length > 0 ? 20 : 0) +
    ((duration_mins ?? 0) >= 5 ? 15 : 0) +
    (notes?.trim() ? 10 : 0)

  const moodEmoji: Record<string, string> = { great: '😊', good: '😐', tired: '😴', anxious: '😟', okay: '😐', issue: '😟' }
  const moodNote = mood ? `[Mood: ${moodEmoji[mood] ?? '😊'} ${mood}] ` : ''
  const reportNotes = moodNote + (notes?.trim() ?? '')

  const reportToken = randomBytes(16).toString('hex')
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const siteUrl = envUrl.includes('pupstep.in') ? envUrl : 'https://pupstep.in'
  const reportUrl = `${siteUrl}/walk-report/${reportToken}`

  try {
    await (db.from('walk_reports') as any).insert({
      provider_id: null,
      connection_id: null,
      walker_name: null,
      logged_by: 'parent',
      owner_id: user.id,
      token: reportToken,
      dog_name: dog.name,
      duration_mins: duration_mins ?? 0,
      poop_count: finalPoopCount,
      pee_count: finalPeeCount,
      notes: reportNotes || null,
      photo_url: photo_url ?? null,
      walk_date: started_at ?? new Date().toISOString(),
      route_points: gps_route ?? null,
      distance_meters: distance_km != null ? Math.round(distance_km * 1000) : null,
      poop_events: poopEvents.length > 0 ? poopEvents : null,
      pee_events: peeEvents.length > 0 ? peeEvents : null,
      quality_score: qualityScore,
      flagged_suspicious: false,
      flag_reason: null,
    })
  } catch (err) {
    console.error('[walk-logs/self] report creation failed:', err)
    return NextResponse.json({ error: 'Failed to create walk report. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, log_id: log.id, report_token: reportToken, report_url: reportUrl }, { status: 201 })
}

// GET /api/walk-logs — returns all walk logs for authenticated user's dogs
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (admin().from('walk_logs') as any)
    .select(`
      *,
      dogs!walk_logs_dog_id_fkey (
        name
      )
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/walk-logs — walker submits a walk log (no auth required)
export async function POST(req: NextRequest) {
  try {
  const body = await req.json()

  if (body.self_walk === true) {
    return handleSelfWalk(req, body)
  }

  const {
    connection_token,
    duration_mins,
    poop_count,
    pee_count,
    mood,
    notes,
    distance_km,
    started_at,
    ended_at,
    gps_route,
    photo_url,
    walk_events,
  } = body

  if (!connection_token) {
    return NextResponse.json({ error: 'connection_token is required' }, { status: 400 })
  }

  const db = admin()

  // Look up the walker_connection by token
  const { data: connection, error: connError } = await (db.from('walker_connections') as any)
    .select('id, dog_id, owner_id, walker_name, walker_phone, status')
    .eq('token', connection_token)
    .single()

  if (connError || !connection) {
    return NextResponse.json({ error: 'Invalid connection token' }, { status: 404 })
  }

  if (connection.status !== 'active') {
    return NextResponse.json({ error: 'Connection is not active' }, { status: 403 })
  }

  const { data: log, error: insertError } = await (db.from('walk_logs') as any)
    .insert({
      connection_id: connection.id,
      dog_id: connection.dog_id,
      owner_id: connection.owner_id,
      walker_name: connection.walker_name ?? null,
      duration_mins: duration_mins ?? null,
      poop_count: poop_count ?? 0,
      pee_count: pee_count ?? 0,
      mood: mood ?? null,
      notes: notes ?? null,
      distance_km: distance_km ?? null,
      started_at: started_at ?? new Date().toISOString(),
      ended_at: ended_at ?? null,
      gps_route: gps_route ?? null,
      photo_url: photo_url ?? null,
    })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Increment total_walks on the walker's profile (fire-and-forget)
  if (connection.walker_phone) {
    ;(db.from('walkers') as any)
      .select('id, total_walks')
      .eq('phone', connection.walker_phone)
      .maybeSingle()
      .then(({ data: w }: { data: { id: string; total_walks: number } | null }) => {
        if (w) {
          (db.from('walkers') as any)
            .update({ total_walks: (w.total_walks ?? 0) + 1, last_seen_at: new Date().toISOString() })
            .eq('id', w.id)
            .then(() => {})
        }
      })
  }

  // Look up owner phone for WhatsApp notification link.
  // profiles.phone is the single source of truth (kept up to date via My Account and
  // setup); walker_connections.owner_phone is only a fallback for accounts that saved
  // a number the old way but haven't touched My Account yet.
  const [{ data: connWithPhone }, { data: ownerProfilePhone }] = await Promise.all([
    (db.from('walker_connections') as any)
      .select('owner_phone, walker_name')
      .eq('id', connection.id)
      .single(),
    (db.from('profiles') as any)
      .select('phone')
      .eq('id', connection.owner_id)
      .maybeSingle(),
  ])
  const resolvedOwnerPhone: string | null = ownerProfilePhone?.phone || connWithPhone?.owner_phone || null

  let wa_link: string | null = null
  if (resolvedOwnerPhone) {
    const phone = resolvedOwnerPhone.replace(/\D/g, '')
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`
    const dogRow = await (db.from('dogs') as any).select('name').eq('id', connection.dog_id).single()
    const dogName = dogRow?.data?.name ?? 'your dog'
    const poopEmoji = (poop_count ?? 0) > 0 ? `💩 ${poop_count}` : ''
    const peeEmoji = (pee_count ?? 0) > 0 ? `💧 ${pee_count}` : ''
    const distText = distance_km ? `${distance_km}km` : ''
    const durText = duration_mins ? `${duration_mins} min` : ''
    const stats = [durText, distText, poopEmoji, peeEmoji].filter(Boolean).join(' · ')
    const moodText = mood ? ` Mood: ${mood} 😊` : ''
    const msg = `🐾 *${dogName}'s walk report*\n${stats}${moodText}\n${notes ? `\n"${notes}"` : ''}\n\nLogged by ${connection.walker_name ?? 'your walker'} via PupStep`
    wa_link = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
  }

  // Also create a public walk report so the pet parent gets the beautiful report card
  const reportToken = randomBytes(16).toString('hex')
  // Always use pupstep.in — ignore env var if it contains the old Vercel domain
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const siteUrl = envUrl.includes('pupstep.in') ? envUrl : 'https://pupstep.in'
  const reportUrl = `${siteUrl}/walk-report/${reportToken}`

  // Extract poop_events / pee_events from walk_events (GPS-tagged taps during walk)
  type WalkEvent = { type: 'pee' | 'poop'; lat: number | null; lng: number | null; ts: string; photoUrl?: string | null }
  const events: WalkEvent[] = Array.isArray(walk_events) ? walk_events : []
  const poopEvents = events
    .filter((e) => e.type === 'poop' && e.lat != null && e.lng != null)
    .map((e) => ({ lat: e.lat!, lng: e.lng!, time: e.ts, photo_url: e.photoUrl ?? null }))
  const peeEvents = events
    .filter((e) => e.type === 'pee' && e.lat != null && e.lng != null)
    .map((e) => ({ lat: e.lat!, lng: e.lng!, time: e.ts }))

  // Use GPS-tagged counts if available, otherwise fall back to submitted counts
  const finalPoopCount = poopEvents.length > 0 ? poopEvents.length : (poop_count ?? 0)
  const finalPeeCount = peeEvents.length > 0 ? peeEvents.length : (pee_count ?? 0)

  const dogRow = await (db.from('dogs') as any).select('name').eq('id', connection.dog_id).maybeSingle()
  const dogName = dogRow?.data?.name ?? 'your dog'

  const moodEmoji: Record<string, string> = { great: '😊', good: '😐', tired: '😴', anxious: '😟' }
  const moodNote = mood ? `[Mood: ${moodEmoji[mood] ?? '😊'} ${mood}] ` : ''
  const reportNotes = moodNote + (notes?.trim() ?? '')

  // Quality score calculation (0-100)
  const gpsPoints = Array.isArray(gps_route) ? gps_route.length : 0
  const qualityScore =
    (gpsPoints >= 5 ? 30 : gpsPoints > 0 ? 15 : 0) +    // GPS route
    (photo_url ? 25 : 0) +                                 // Dog photo
    (poopEvents.length + peeEvents.length > 0 ? 20 : 0) + // Events
    ((duration_mins ?? 0) >= 5 ? 15 : 0) +                // Duration
    (notes?.trim() ? 10 : 0)                               // Notes

  // --- Paywall delivery gate ---
  // Uses the shared entitlement helper (same logic as the viewing paywall in
  // app/walk-report/[token]/page.tsx, app/home/page.tsx, app/upgrade/page.tsx,
  // app/my-reports/page.tsx) so a cancelled-but-not-yet-expired subscription
  // still counts as entitled here too — this file used to have its own ad-hoc
  // copy of this logic that didn't respect that rule.
  const [entitlement, { data: ownerProfile }, { count: priorReportCount }] = await Promise.all([
    getEntitlement(db, connection.owner_id),
    (db.from('profiles') as any)
      .select('notification_preferences')
      .eq('id', connection.owner_id)
      .maybeSingle(),
    // Real "has this owner ever had a report before" check — NOT based on
    // trial_started_at being null, which is also null for a lapsed account
    // whose profile row is missing/incomplete. Using null trial_started_at
    // as a proxy for "first ever report" would let a lapsed subscriber's
    // data gap silently re-grant a fresh trial and bypass the paywall.
    // NOTE for self-walk launch: once migration 058 adds the logged_by
    // column, add .eq('logged_by', 'walker') here so a parent's self-logged
    // walk doesn't suppress the trial start on the walker's first real
    // report. Adding it BEFORE the migration runs makes this query error
    // against the live schema — count comes back null, which (with the old
    // `?? 0` fallback) made EVERY report look like the first ever and
    // re-sent the "your trial has started" email on each one.
    (db.from('walk_reports') as any)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', connection.owner_id),
  ])

  // Strict === 0, never `?? 0`: if the count query errors, count is null —
  // fail safe as "not first" (worst case: a genuinely-new owner misses the
  // trial banner) rather than re-starting trials and re-sending trial
  // emails on every report.
  const isGenuinelyFirstReportEver = priorReportCount === 0

  // Only start the trial clock on a genuinely-first-ever report for this
  // owner — never on a lapsed account whose trial_started_at happens to be
  // unset for some other reason (e.g. a subscription granted without ever
  // going through the trial flow).
  //
  // This is AWAITED, not fire-and-forget: `entitlement` above was fetched
  // before the trial starts, so on a first-ever report it would otherwise
  // show as not-entitled — silently skipping this report's own email AND
  // leaving a race window where anyone (the walker included) who opens the
  // report link in the next moment sees the locked paywall screen, on the
  // very first walk. Awaiting this write, then explicitly treating "this
  // request just started the trial" as entitled below, closes both.
  if (isGenuinelyFirstReportEver) {
    try {
      // upsert, not update: most real accounts never get a `profiles` row
      // created any other way (the signup trigger that's supposed to isn't
      // reliably firing — confirmed directly against prod, most owners have
      // no profiles row at all). update() against a nonexistent row silently
      // affects zero rows, so the trial clock would never actually persist —
      // the report page would show the locked paywall on the very first
      // walk despite the trial being "active" in intent.
      await (db.from('profiles') as any)
        .upsert({ id: connection.owner_id, trial_started_at: new Date().toISOString() }, { onConflict: 'id' })
    } catch { /* non-critical — entitlement fallback below still covers this request */ }

    // No browser session available here (the walker submits this, not the
    // parent), so we fall back to the owner's user_id as the GA4 client_id —
    // won't merge with their client-side session, but the event still counts.
    sendGA4Event(connection.owner_id, { name: 'trial_start' })
  }

  const deliveryAllowed = entitlement.isEntitled || isGenuinelyFirstReportEver
  // --- End paywall gate setup ---

  // --- GPS plausibility check (flag-only, never blocks) ---
  // Server-side sanity check on the submitted route: catches the easiest
  // fakes (no GPS at all on a real-length walk, or GPS present but showing
  // essentially zero movement over a claimed 10+ minute walk). This never
  // rejects or alters the response to the walker — it only records a flag
  // for admin review (see app/api/admin/v2/reports/route.ts).
  const walkPlausibility = assessWalkPlausibility(
    Array.isArray(gps_route) ? gps_route : null,
    duration_mins ?? 0
  )
  // --- End GPS plausibility check ---

  // Must complete before we respond — if this insert fails, the walker must NOT
  // be handed back a report_url that points at a row that doesn't exist.
  try {
    await (db.from('walk_reports') as any).insert({
      provider_id: null,
      walker_name: connection.walker_name ?? 'Your Walker',
      connection_id: connection.id,
      owner_id: connection.owner_id,
      token: reportToken,
      dog_name: dogName,
      duration_mins: duration_mins ?? 0,
      poop_count: finalPoopCount,
      pee_count: finalPeeCount,
      notes: reportNotes || null,
      photo_url: photo_url ?? null,
      walk_date: started_at ?? new Date().toISOString(),
      route_points: gps_route ?? null,
      distance_meters: distance_km != null ? Math.round(distance_km * 1000) : null,
      poop_events: poopEvents.length > 0 ? poopEvents : null,
      pee_events: peeEvents.length > 0 ? peeEvents : null,
      quality_score: qualityScore,
      flagged_suspicious: walkPlausibility.suspicious,
      flag_reason: walkPlausibility.reason,
    })
  } catch (err) {
    console.error('[walk-logs] report creation failed:', err)
    return NextResponse.json({ error: 'Failed to create walk report. Please try again.' }, { status: 500 })
  }

  // Only send the report email if the owner is within their trial or has an active subscription.
  // This is the single email sent per walk — for the owner's very first-ever report, it
  // includes an extra "your trial has started" banner at the top instead of a separate email.
  //
  // Runs via after() so the email work is NOT held up in the response, but ALSO isn't killed:
  // Vercel freezes the function the instant the response returns, so a bare fire-and-forget
  // IIFE here was getting cut off before the email fetch completed (this is why every
  // walk_reports row had email_sent_at = NULL). after() keeps the function alive to finish.
  if (deliveryAllowed) {
    after(async () => {
      // Check notification preference and send email to parent
      try {
        // Get parent email
        const { data: { user: ownerUser } } = await db.auth.admin.getUserById(connection.owner_id)
        const ownerEmail = ownerUser?.email

        if (ownerEmail) {
          // Use already-fetched notification_preferences from ownerProfile
          const prefs = (ownerProfile?.notification_preferences ?? {}) as Record<string, boolean>
          const reportEmailEnabled = prefs.report_email !== false // default true

          if (reportEmailEnabled) {
            const isFirstReport = isGenuinelyFirstReportEver
            const trialExpiryLabel = isFirstReport
              ? new Date(Date.now() + 3 * 86400 * 1000)
                  .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
              : undefined

            const { sendEmail, walkReportEmail } = await import('@/lib/email')
            sendEmail({
              to: ownerEmail,
              subject: `🐾 ${dogName}'s walk report is ready`,
              html: walkReportEmail({
                dogName,
                walkerName: connection.walker_name ?? 'Your walker',
                durationMins: duration_mins ?? null,
                distanceKm: distance_km ?? null,
                poopCount: finalPoopCount,
                peeCount: finalPeeCount,
                reportUrl,
                trialExpiryLabel,
              }),
            }).catch(() => {})

            // Track email sent
            await (db.from('walk_reports') as any)
              .update({ email_sent_at: new Date().toISOString() })
              .eq('token', reportToken)
              .catch(() => {})
          }
        }
      } catch { /* non-critical */ }
    })
  }

  // Build WhatsApp link — report URL for active subscribers/trial, upgrade prompt otherwise
  if (resolvedOwnerPhone) {
    const phone = resolvedOwnerPhone.replace(/\D/g, '')
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`
    if (deliveryAllowed) {
      const msg = `🐾 *${dogName}'s walk report is ready!*\n\nTap to view: ${reportUrl}\n\nLogged by ${connection.walker_name ?? 'your walker'} via PupStep`
      wa_link = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
    } else {
      const msg = `🐾 ${dogName} went for a walk today! Upgrade PupStep to receive the full report: https://pupstep.in/upgrade`
      wa_link = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
    }
  }

  return NextResponse.json({ ok: true, log_id: log.id, wa_link, report_token: reportToken, report_url: reportUrl }, { status: 201 })
  } catch (err) {
    console.error('[walk-logs POST] unhandled error:', err)
    return NextResponse.json({ error: 'Failed to submit walk. Please try again.' }, { status: 500 })
  }
}
