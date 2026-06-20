import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import MyDogsClient from './MyDogsClient'
import type { Dog, WalkLogWithDog } from '@/lib/supabase/types'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type DogWithWalker = Dog & {
  walker_name: string | null
  walker_phone: string | null
  has_active_walker: boolean
}

export default async function MyDogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/account?next=/my-dogs')
  }

  const db = admin()

  // Fetch dogs, walk logs, and active walker connections in parallel
  const [{ data: dogs }, { data: walkLogs }, { data: connections }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('dogs') as any)
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_logs') as any)
      .select(`*, dogs!walk_logs_dog_id_fkey (name)`)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walker_connections') as any)
      .select('dog_id, walker_name, walker_phone, status')
      .eq('owner_id', user.id)
      .eq('status', 'active'),
  ])

  // Map active connections by dog_id
  const connectionsByDog: Record<string, { walker_name: string | null; walker_phone: string | null }> = {}
  for (const conn of connections ?? []) {
    connectionsByDog[conn.dog_id] = {
      walker_name: conn.walker_name ?? null,
      walker_phone: conn.walker_phone ?? null,
    }
  }

  // Merge connection data into dogs
  const dogsWithWalkers: DogWithWalker[] = (dogs ?? []).map((dog: Dog) => ({
    ...dog,
    walker_name: connectionsByDog[dog.id]?.walker_name ?? null,
    walker_phone: connectionsByDog[dog.id]?.walker_phone ?? null,
    has_active_walker: !!connectionsByDog[dog.id],
  }))

  return (
    <MyDogsClient
      dogs={dogsWithWalkers}
      walkLogs={(walkLogs ?? []) as WalkLogWithDog[]}
    />
  )
}
