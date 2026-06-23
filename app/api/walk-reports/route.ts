import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendEmail, emailTemplate } from '@/lib/email'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/walk-reports — provider fetches their own reports list (auth required)
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find provider by email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id')
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin().from('walk_reports') as any)
    .select('*')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

// POST /api/walk-reports — create a new walk report (auth required)
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find provider by email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin().from('providers') as any)
    .select('id, name')
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  const body = await req.json()
  const {
    dog_name, duration_mins, poop_count, pee_count, notes, photo_url, walk_date,
    start_location, end_location, route_points, distance_meters, poop_events, pee_events,
    client_id, // new: linked client from provider_clients
  } = body

  if (!dog_name || duration_mins == null) {
    return NextResponse.json({ error: 'Missing required fields: dog_name, duration_mins' }, { status: 400 })
  }

  // If client_id provided, verify it belongs to this provider and get owner WhatsApp
  let ownerWhatsapp: string | null = null
  let ownerName: string | null = null
  if (client_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clientRow } = await (admin().from('provider_clients') as any)
      .select('id, owner_whatsapp, owner_name')
      .eq('id', client_id)
      .eq('provider_id', provider.id)
      .single()
    if (clientRow) {
      ownerWhatsapp = clientRow.owner_whatsapp
      ownerName = clientRow.owner_name
    }
  }

  // Generate 32-char hex share token
  const token = require('crypto').randomBytes(16).toString('hex')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin().from('walk_reports') as any)
    .insert({
      provider_id: provider.id,
      client_id: client_id ?? null,
      token,
      dog_name: dog_name.trim(),
      duration_mins: Number(duration_mins),
      poop_count: Number(poop_count ?? 0),
      pee_count: Number(pee_count ?? 0),
      notes: notes?.trim() || null,
      photo_url: photo_url || null,
      walk_date: walk_date ?? new Date().toISOString(),
      start_location: start_location?.trim() || null,
      end_location: end_location?.trim() || null,
      route_points: route_points ?? null,
      distance_meters: distance_meters != null ? Number(distance_meters) : null,
      poop_events: poop_events ?? null,
      pee_events: pee_events ?? null,
    })
    .select('id, token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget email to dog owner via client_id → owner lookup
  if (client_id) {
    ;(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: clientRow } = await (admin().from('provider_clients') as any)
          .select('owner_id')
          .eq('id', client_id)
          .single()

        if (clientRow?.owner_id) {
          const { data: { user: ownerUser } } = await admin().auth.admin.getUserById(clientRow.owner_id as string)
          const ownerEmail = ownerUser?.email
          if (ownerEmail) {
            const walkerName: string = provider.name as string
            const durationMins: number = Number(duration_mins)
            sendEmail({
              to: ownerEmail,
              subject: `🐾 ${(dog_name as string).trim()}'s walk report is ready`,
              html: emailTemplate(
                'Walk report ready!',
                `${walkerName} just submitted a walk report for ${(dog_name as string).trim()}. Duration: ${durationMins} mins.`,
                'View report',
                'https://pupstep.in/my-reports',
              ),
            }).catch(() => {})
          }
        }
      } catch {
        // swallow — never block the response
      }
    })()
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'
  const reportUrl = `${siteUrl}/walk-report/${data.token}`

  // Build pre-composed WhatsApp link if we have the owner's number
  let whatsapp_link: string | null = null
  if (ownerWhatsapp) {
    const providerFirst = provider.name.split(' ')[0]
    const greeting = ownerName ? `Hi ${ownerName.split(' ')[0]}!` : 'Hi!'
    const msg = encodeURIComponent(
      `${greeting} Here is ${dog_name.trim()}'s walk report from ${providerFirst} 🐾\n${reportUrl}`
    )
    whatsapp_link = `https://wa.me/${ownerWhatsapp}?text=${msg}`
  }

  return NextResponse.json({ ok: true, token: data.token, id: data.id, report_url: reportUrl, whatsapp_link })
}
