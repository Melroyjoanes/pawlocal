import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import QRDisplayClient from './QRDisplayClient'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function SetupQRPage({
  searchParams,
}: {
  searchParams: Promise<{ dog?: string }>
}) {
  const { dog: dogId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/account?next=/setup/qr')
  }

  if (!dogId) {
    redirect('/setup')
  }

  const db = admin()

  // Fetch dog info (verify ownership)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dog } = await (db.from('dogs') as any)
    .select('id, name, breed')
    .eq('id', dogId)
    .eq('owner_id', user.id)
    .single()

  if (!dog) {
    redirect('/setup')
  }

  // Fetch or create walker connection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: connection } = await (db.from('walker_connections') as any)
    .select('id, token, walker_name, walker_phone, status')
    .eq('dog_id', dogId)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!connection) {
    const token = generateToken()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newConn } = await (db.from('walker_connections') as any)
      .insert({
        dog_id: dogId,
        owner_id: user.id,
        token,
        status: 'pending',
      })
      .select('id, token, walker_name, walker_phone, status')
      .single()
    connection = newConn
  }

  if (!connection) {
    redirect('/setup')
  }

  return (
    <QRDisplayClient
      token={connection.token}
      dogName={dog.name}
      dogId={dogId}
      walkerName={connection.walker_name ?? null}
      walkerPhone={connection.walker_phone ?? null}
      status={connection.status}
    />
  )
}

function generateToken(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
