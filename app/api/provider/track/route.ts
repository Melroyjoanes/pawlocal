import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { provider_id, event_type } = await req.json()

    if (!provider_id || !['view', 'whatsapp_click', 'call_click'].includes(event_type)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = adminClient()
    const { error } = await supabase
      .from('provider_analytics')
      .insert({ provider_id, event_type })

    if (error) {
      // If table doesn't exist yet (migration not run), fail silently
      return NextResponse.json({ ok: false })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
