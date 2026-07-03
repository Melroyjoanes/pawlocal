import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/walks/notify-start — called by walker when walk starts
// No auth required — token proves identity
// Note: the "walk started" email was removed to avoid over-notifying parents
// (see the walk-logs report email for the single email sent per walk).
export async function POST(req: NextRequest) {
  try {
    const { connection_token } = await req.json()
    if (!connection_token) return NextResponse.json({ ok: false }, { status: 400 })

    const db = admin()

    // Look up the connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: connection } = await (db.from('walker_connections') as any)
      .select('walker_name, owner_id, dog_id, status')
      .eq('token', connection_token)
      .single()

    if (!connection || connection.status !== 'active') {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
