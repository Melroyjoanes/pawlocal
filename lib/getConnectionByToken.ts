import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export interface ConnectionInfo {
  id: string
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
  walkTimeBucket: string | null
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

  const SELECT_WITH_WALK_TIME_BUCKET = `
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
        care_focus,
        walk_time_bucket
      )
    `
  const SELECT_WITHOUT_WALK_TIME_BUCKET = `
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
    `

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: connection, error } = await (db.from('walker_connections') as any)
    .select(SELECT_WITH_WALK_TIME_BUCKET)
    .eq('token', token)
    .single()

  // walk_time_bucket is a nullable column added in migration 053 — until that
  // migration is run manually against prod, the column won't exist yet. This
  // function is shared by /connect/[token] and /walker/[token], so failing
  // here breaks every single walker invite link site-wide — retry without
  // the column rather than ever letting that happen again.
  if (error && /walk_time_bucket/i.test(error.message ?? '')) {
    ;({ data: connection, error } = await (db.from('walker_connections') as any)
      .select(SELECT_WITHOUT_WALK_TIME_BUCKET)
      .eq('token', token)
      .single())
  }

  if (error || !connection) return null

  // Look up owner first name + phone. profiles.phone is the single source of truth
  // (kept current via My Account and setup); walker_connections.owner_phone is only a
  // fallback for accounts that saved a number the old way but haven't touched My Account yet.
  let ownerFirstName = 'Your owner'
  let ownerProfilePhone: string | null = null
  if (connection.dogs?.owner_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (db.from('profiles') as any)
      .select('name, full_name, phone')
      .eq('id', connection.dogs.owner_id)
      .single()
    const fullName = profile?.name ?? profile?.full_name ?? null
    if (fullName) ownerFirstName = fullName.split(' ')[0]
    ownerProfilePhone = profile?.phone ?? null
  }

  return {
    id: connection.id,
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
    ownerPhone: ownerProfilePhone || connection.owner_phone || null,
    careFocus: connection.dogs?.care_focus ?? 'normal',
    expectedWalkerPhone: connection.expected_walker_phone ?? null,
    walkTimeBucket: connection.dogs?.walk_time_bucket ?? null,
  }
}
