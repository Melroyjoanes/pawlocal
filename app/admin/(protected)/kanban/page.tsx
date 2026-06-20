import { createClient } from '@supabase/supabase-js'
import KanbanClient from './KanbanClient'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export const metadata = { title: 'Ops Kanban — PupStep Admin' }
export const dynamic = 'force-dynamic'

export default async function KanbanPage() {
  const db = admin()

  const [
    { data: connections },
    { data: walkLogs },
    { data: walkReports },
    { data: groomingReports },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walker_connections') as any)
      .select('id, token, dog_id, owner_id, walker_name, walker_phone, walker_role, status, otp, qr_generated_at, claimed_at, created_at, dogs(name, breed)')
      .order('created_at', { ascending: false })
      .limit(200),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_logs') as any)
      .select('id, connection_id, dog_id, owner_id, walker_name, started_at, ended_at, duration_mins, distance_km, poop_count, pee_count, mood, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('walk_reports') as any)
      .select('id, token, provider_id, customer_id, dog_name, walk_date, duration_mins, created_at, providers(name, email)')
      .order('created_at', { ascending: false })
      .limit(200),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('grooming_reports') as any)
      .select('id, token, provider_id, customer_id, dog_name, grooming_date, duration_mins, created_at, providers(name, email)')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  return (
    <KanbanClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connections={(connections ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walkLogs={(walkLogs ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walkReports={(walkReports ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      groomingReports={(groomingReports ?? []) as any[]}
    />
  )
}
