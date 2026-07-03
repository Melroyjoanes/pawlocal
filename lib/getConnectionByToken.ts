import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export interface ConnectionInfo {
  token: string
  status: string
  dogName: string
  dogBreed: string | null
  dogPhoto: string | null
  healthNotes: string | null
  ownerFirstName: string
  walkerName: string | null
  walkerPhone: string | null
  walkerRole: string | null
  ownerPhone: string | null
  careFocus: string
  expectedWalkerPhone: string | null
}

/**
 * Shared lookup used by both /api/connect/[token] (the public API route) and the
 * /walker/[token] and /connect/[token] server pages.
 *
 * The two pages used to call the API route via `fetch(`${baseUrl}/api/connect/${token}`)`
 * from inside their own Server Component — an unnecessary extra HTTP round-trip (DNS/TLS/
 * function-invocation overhead) to reach a route that just runs this same DB query. Calling
 * this function directly from the pages skips that hop entirely.
 */
export async function getConnectionByToken(token: string): Promise<ConnectionInfo | null> {
  const db = admin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: connection, error } = await (db.from('walker_connections') as any)
    .select(`
      id,
      token,
      status,
      walker_name,
      walker_phone,
      walker_role,
      owner_phone,
      claimed_at,
      expected_walker_phone,
      dogs!walker_connections_dog_id_fkey (
        name,
        breed,
        photo_url,
        health_notes,
        owner_id,
        care_focus
      )
    `)
    .eq('token', token)
    .single()

  if (error || !connection) return null

  // Look up owner first name
  let ownerFirstName = 'Your owner'
  if (connection.dogs?.owner_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (db.from('profiles') as any)
      .select('name, full_name')
      .eq('id', connection.dogs.owner_id)
      .single()
    const fullName = profile?.name ?? profile?.full_name ?? null
    if (fullName) ownerFirstName = fullName.split(' ')[0]
  }

  return {
    token: connection.token,
    status: connection.status,
    dogName: connection.dogs?.name ?? 'Dog',
    dogBreed: connection.dogs?.breed ?? null,
    dogPhoto: connection.dogs?.photo_url ?? null,
    healthNotes: connection.dogs?.health_notes ?? null,
    ownerFirstName,
    walkerName: connection.walker_name ?? null,
    walkerPhone: connection.walker_phone ?? null,
    walkerRole: connection.walker_role ?? null,
    ownerPhone: connection.owner_phone ?? null,
    careFocus: connection.dogs?.care_focus ?? 'normal',
    expectedWalkerPhone: connection.expected_walker_phone ?? null,
  }
}
