import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailTemplate } from '@/lib/email'

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/cron/weekly-summary
// Runs every Monday — sends pet parents a digest of their dog's walks from the past week.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = adminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString()

  // Get all walk logs from the past 7 days, grouped by owner
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logs, error } = await (db.from('walk_logs') as any)
    .select('owner_id, dog_id, duration_mins, distance_km, poop_count, pee_count, started_at, dogs(name)')
    .gte('started_at', sevenDaysAgo)
    .order('started_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by owner_id
  const byOwner = new Map<string, typeof logs>()
  for (const log of (logs ?? [])) {
    if (!byOwner.has(log.owner_id)) byOwner.set(log.owner_id, [])
    byOwner.get(log.owner_id)!.push(log)
  }

  let processed = 0

  for (const [ownerId, ownerLogs] of byOwner) {
    if (!ownerLogs.length) continue

    const { data: { user } } = await db.auth.admin.getUserById(ownerId)
    const email = user?.email
    if (!email) continue

    // Respect the owner's weekly_summary notification preference (default true if unset)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ownerProfile } = await (db.from('profiles') as any)
      .select('notification_preferences')
      .eq('id', ownerId)
      .maybeSingle()
    const prefs = (ownerProfile?.notification_preferences ?? {}) as Record<string, boolean>
    const weeklySummaryEnabled = prefs.weekly_summary !== false // default true
    if (!weeklySummaryEnabled) continue

    const totalWalks = ownerLogs.length
    const totalMins = ownerLogs.reduce((s: number, l: { duration_mins: number }) => s + (l.duration_mins ?? 0), 0)
    const totalKm = ownerLogs.reduce((s: number, l: { distance_km: number }) => s + (l.distance_km ?? 0), 0)
    const totalPoops = ownerLogs.reduce((s: number, l: { poop_count: number }) => s + (l.poop_count ?? 0), 0)
    const dogName = ownerLogs[0]?.dogs?.name ?? 'your dog'

    const statsLine = [
      `🐾 ${totalWalks} walk${totalWalks !== 1 ? 's' : ''}`,
      totalMins > 0 ? `⏱ ${totalMins} mins total` : null,
      totalKm > 0 ? `📏 ${totalKm.toFixed(1)} km` : null,
      totalPoops > 0 ? `💩 ${totalPoops}` : null,
    ].filter(Boolean).join(' · ')

    sendEmail({
      to: email,
      subject: `${dogName}'s weekly walk summary 🐾`,
      html: emailTemplate(
        `${dogName}'s week in review`,
        `Here's what ${dogName} got up to this week:\n\n${statsLine}\n\nKeep up the great work! Consistent walks make for a happy, healthy dog.`,
        'View all reports',
        'https://pupstep.in/my-reports',
      ),
    }).catch(() => {})

    processed++
  }

  return NextResponse.json({ ok: true, processed })
}
