import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin().from('provider_clients') as any)
    .select('id, pet_name, invite_status, invite_expires_at, linked_at, invite_token, provider_id')
    .eq('owner_user_id', user.id)
    .neq('invite_status', 'revoked')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data ?? []).map(async (row: any) => {
      if (row.provider_id && row.invite_status === 'accepted') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: p } = await (admin().from('providers') as any)
          .select('name, category_slug, whatsapp')
          .eq('id', row.provider_id)
          .maybeSingle()
        return { ...row, provider_name: p?.name ?? null, provider_category: p?.category_slug ?? null }
      }
      return { ...row, provider_name: null, provider_category: null }
    })
  )

  return NextResponse.json(enriched)
}
