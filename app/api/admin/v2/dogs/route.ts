import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/admin/v2/dogs — all dogs with parent info and walker status
export async function GET() {
  const db = adminDb()

  const { data: dogs } = await (db.from('dogs') as any)
    .select(`
      id,
      name,
      breed,
      care_focus,
      photo_url,
      health_notes,
      walking_instructions,
      owner_id,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!dogs?.length) return NextResponse.json([])

  type Dog = {
    id: string
    name: string
    breed: string | null
    care_focus: string | null
    photo_url: string | null
    health_notes: string | null
    walking_instructions: string | null
    owner_id: string
    created_at: string
  }

  const ownerIds = [...new Set((dogs as Dog[]).map((d) => d.owner_id))]
  const dogIds = (dogs as Dog[]).map((d) => d.id)

  const [profilesRes, connectionsRes, reportsRes] = await Promise.all([
    (db.from('profiles') as any)
      .select('id, full_name')
      .in('id', ownerIds),
    (db.from('walker_connections') as any)
      .select('dog_id, status')
      .in('dog_id', dogIds)
      .eq('status', 'active'),
    (db.from('walk_reports') as any)
      .select('dog_id: owner_id, created_at')
      .order('created_at', { ascending: false }),
  ])

  // Get emails for owners
  const emailMap: Record<string, string> = {}
  for (const uid of ownerIds) {
    const { data } = await db.auth.admin.getUserById(uid)
    if (data?.user?.email) emailMap[uid] = data.user.email
  }

  const profiles: { id: string; full_name: string | null }[] = profilesRes.data ?? []
  const connections: { dog_id: string; status: string }[] = connectionsRes.data ?? []
  // walk_reports don't have dog_id in all schemas - get them by owner_id match
  // Fetch walk logs which DO have dog_id
  const { data: walkLogs } = await (db.from('walk_logs') as any)
    .select('dog_id, created_at')
    .in('dog_id', dogIds)
    .order('created_at', { ascending: false })

  const logs: { dog_id: string; created_at: string }[] = walkLogs ?? []

  const result = (dogs as Dog[]).map((dog) => {
    const owner = profiles.find((p) => p.id === dog.owner_id)
    const activeWalkers = connections.filter((c) => c.dog_id === dog.id).length
    const dogLogs = logs.filter((l) => l.dog_id === dog.id)
    const reportCount = dogLogs.length
    const lastReportDate = dogLogs[0]?.created_at ?? null

    return {
      id: dog.id,
      name: dog.name,
      breed: dog.breed ?? null,
      careFocus: dog.care_focus ?? 'normal',
      hasPhoto: !!dog.photo_url,
      hasHealthNotes: !!dog.health_notes && dog.health_notes.trim().length > 0,
      hasWalkingInstructions: !!dog.walking_instructions && dog.walking_instructions.trim().length > 0,
      ownerName: owner?.full_name ?? null,
      ownerEmail: emailMap[dog.owner_id] ?? null,
      activeWalkers,
      reportCount,
      lastReportDate,
      createdAt: dog.created_at,
    }
  })

  return NextResponse.json(result)
}
