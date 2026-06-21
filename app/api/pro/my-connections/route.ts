import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/pro/my-connections — authenticated pro walker
// Returns this provider's active walker_connections joined with dog + parent info.
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()

  // Look up provider by email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (db.from('providers') as any)
    .select('id')
    .eq('email', user.email)
    .eq('status', 'approved')
    .maybeSingle()

  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch active connections for this provider's dogs
  // walker_connections.dog_id -> dogs (provider_id, name, breed, photo_url, owner_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: connections, error } = await (db.from('walker_connections') as any)
    .select(`
      id,
      token,
      walker_name,
      walker_phone,
      claimed_at,
      dogs!walker_connections_dog_id_fkey (
        id,
        name,
        breed,
        photo_url,
        owner_id
      )
    `)
    .eq('status', 'active')
    .eq('dogs.provider_id', provider.id)
    .order('claimed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with parent profile (name + phone) per connection
  const enriched = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connections ?? []).map(async (conn: any) => {
      const ownerId = conn.dogs?.owner_id ?? null
      let parentName: string | null = null
      let parentPhone: string | null = null

      if (ownerId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (db.from('profiles') as any)
          .select('name, full_name, phone')
          .eq('id', ownerId)
          .maybeSingle()
        const rawName = profile?.name ?? profile?.full_name ?? null
        parentName = rawName ? rawName.split(' ')[0] : null
        parentPhone = profile?.phone ?? null
      }

      return {
        id: conn.id,
        token: conn.token,
        walker_name: conn.walker_name,
        walker_phone: conn.walker_phone,
        claimed_at: conn.claimed_at,
        dog_id: conn.dogs?.id ?? null,
        dog_name: conn.dogs?.name ?? 'Dog',
        dog_breed: conn.dogs?.breed ?? null,
        dog_photo: conn.dogs?.photo_url ?? null,
        parent_user_id: ownerId,
        parent_name: parentName,
        parent_phone: parentPhone,
      }
    })
  )

  return NextResponse.json(enriched)
}
