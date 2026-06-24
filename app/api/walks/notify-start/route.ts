import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/walks/notify-start — called by walker when walk starts
// No auth required — token proves identity
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

    // Get dog name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dog } = await (db.from('dogs') as any)
      .select('name')
      .eq('id', connection.dog_id)
      .single()

    const dogName = dog?.name ?? 'your dog'
    const walkerName = connection.walker_name ?? 'Your walker'
    const now = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

    // Get owner email
    const { data: { user: owner } } = await db.auth.admin.getUserById(connection.owner_id)
    const ownerEmail = owner?.email
    if (!ownerEmail) return NextResponse.json({ ok: true })

    // Send email — fire and don't block response
    sendEmail({
      to: ownerEmail,
      subject: `🐾 ${dogName}'s walk has started!`,
      html: `
        <p>Hi!</p>
        <p><strong>${dogName}'s walk has started</strong> at ${now}.</p>
        <p>${walkerName} is now walking ${dogName}. You'll receive a full GPS report with photos when the walk ends.</p>
        <p style="margin-top:24px;">
          <a href="https://pupstep.in/my-reports"
             style="background:#FF8C52;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">
            View walk reports →
          </a>
        </p>
        <p style="margin-top:24px;color:#9CA3AF;font-size:13px;">The PupStep Team · pupstep.in</p>
      `,
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
