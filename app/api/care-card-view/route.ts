import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/care-card-view — called when a parent opens a walk care card
// Body: { token: string, type: 'walk' | 'grooming' }
export async function POST(req: NextRequest) {
  try {
    const { token, type = 'walk' } = await req.json()
    if (!token) return NextResponse.json({ ok: false }, { status: 400 })

    // Find provider_id from the appropriate table
    const table = type === 'grooming' ? 'grooming_reports' : 'walk_reports'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: report } = await (admin().from(table) as any)
      .select('provider_id')
      .eq('token', token)
      .maybeSingle()

    if (!report?.provider_id) return NextResponse.json({ ok: true }) // no-op if not found

    // Record in provider_analytics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin().from('provider_analytics') as any).insert({
      provider_id: report.provider_id,
      event_type: 'care_card_view',
      metadata: { token, type },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // never fail silently for tracking
  }
}
