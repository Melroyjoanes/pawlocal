import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
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

  // Look up owner phone for WhatsApp notification link
  const { data: connWithPhone } = await (db.from('walker_connections') as any)
    .select('owner_phone, walker_name')
    .eq('id', connection.id)
    .single()

  let wa_link: string | null = null
  if (connWithPhone?.owner_phone) {
    const phone = connWithPhone.owner_phone.replace(/\D/g, '')
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`
    const dogRow = await (db.from('dogs') as any).select('name').eq('id', connection.dog_id).single()
    const dogName = dogRow?.data?.name ?? 'your dog'
    const poopEmoji = (poop_count ?? 0) > 0 ? `💩 ${poop_count}` : ''
    const peeEmoji = (pee_count ?? 0) > 0 ? `🌿 ${pee_count}` : ''
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
    .map((e) => ({ lat: e.lat!, lng: e.lng!, time: e.ts }))
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
  // Fetch owner trial + subscription status synchronously so both the fire-and-forget
  // email block and the wa_link build below can use the same result.
  const [{ data: ownerProfile }, { data: ownerSub }] = await Promise.all([
    (db.from('profiles') as any)
      .select('trial_started_at, notification_preferences')
      .eq('id', connection.owner_id)
      .maybeSingle(),
    (db.from('subscriptions') as any)
      .select('id')
      .eq('user_id', connection.owner_id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle(),
  ])

  const TRIAL_DAYS = 3
  const trialStart: string | null = ownerProfile?.trial_started_at ?? null
  const trialActive = trialStart
    ? (Date.now() - new Date(trialStart).getTime()) < TRIAL_DAYS * 86400 * 1000
    : true // no trial started yet = first report = allow delivery
  const isPro = !!ownerSub
  const deliveryAllowed = isPro || trialActive

  // Set trial_started_at if this is the first report (fire-and-forget — non-blocking)
  if (!trialStart) {
    ;(db.from('profiles') as any)
      .update({ trial_started_at: new Date().toISOString() })
      .eq('id', connection.owner_id)
      .catch(() => {})
  }
  // --- End paywall gate setup ---

  // Fire-and-forget — don't block the response on report creation
  ;(async () => {
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
      })

      // Send trial-start email when this is the first report
      if (!trialStart && deliveryAllowed) {
        try {
          const trialExpiry = new Date(Date.now() + 3 * 86400 * 1000)
            .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
          const { sendEmail, emailTemplate } = await import('@/lib/email')
          const { data: { user: ownerUser } } = await db.auth.admin.getUserById(connection.owner_id)
          const ownerEmail = ownerUser?.email
          if (ownerEmail) {
            sendEmail({
              to: ownerEmail,
              subject: `🐾 ${dogName}'s first walk report is in! Your trial has started.`,
              html: emailTemplate(
                `${dogName}'s first walk report is in!`,
                `Your 3-day free trial has started. You can receive walk reports until ${trialExpiry}. After that, upgrade for ₹199/month to keep reports coming.\n\nMake sure your walker logs walks every day to get the most out of your trial.`,
                'View walk report',
                reportUrl,
              ),
            }).catch(() => {})
          }
        } catch { /* non-critical */ }
      }

      // Only send email delivery if the owner is within their trial or has an active subscription
      if (deliveryAllowed) {
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
      }
    } catch (err) {
      console.error('[walk-logs] report creation failed:', err)
    }
  })()

  // Build WhatsApp link — report URL for active subscribers/trial, upgrade prompt otherwise
  if (connWithPhone?.owner_phone) {
    const phone = connWithPhone.owner_phone.replace(/\D/g, '')
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
    return NextResponse.json({ error: 'Internal server error. Please try again.' }, { status: 500 })
  }
}
