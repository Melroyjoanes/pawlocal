import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    walker_connection_id: string
    dog_id: string
    walker_name: string
    walker_phone: string
    parent_user_id: string
    parent_phone: string
  }

  const db = admin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dog } = await (db.from('dogs') as any)
    .select('name')
    .eq('id', body.dog_id)
    .single()

  const dogName: string = dog?.name ?? 'Your dog'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error } = await (db.from('walk_sessions') as any)
    .insert({
      walker_connection_id: body.walker_connection_id,
      dog_id: body.dog_id,
      walker_name: body.walker_name,
      walker_phone: body.walker_phone,
      parent_user_id: body.parent_user_id,
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  const sessionId: string = session.id
  const digits = body.parent_phone.replace(/\D/g, '').replace(/^0/, '')
  const trackUrl = `https://pupstep.in/live/${sessionId}`
  const text = encodeURIComponent(
    `🐾 ${dogName}'s walk just started!\n\nTrack live here:\n${trackUrl}\n\nYou'll get another message when the walk ends.`
  )
  const wa_link = `https://wa.me/91${digits}?text=${text}`

  return NextResponse.json({ session_id: sessionId, wa_link })
}
