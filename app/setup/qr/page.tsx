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
  searchParams: Promise<{ dog?: string; phone?: string }>
}) {
  const { dog: dogId, phone: ownerPhone } = await searchParams

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
    .select('id, token, walker_name, walker_phone, status, otp, owner_phone')
    .eq('dog_id', dogId)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!connection) {
    const token = generateToken()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newConn, error: insertErr } = await (db.from('walker_connections') as any)
      .insert({
        dog_id: dogId,
        owner_id: user.id,
        token,
        status: 'pending',
        otp: generateOTP(),
        owner_phone: ownerPhone ?? null,
      })
      .select('id, token, walker_name, walker_phone, status, otp, owner_phone')
      .single()

    if (insertErr) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: '#FFFBEB' }}>
          <span className="text-5xl">⚙️</span>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>
            One-time setup needed
          </h1>
          <p className="text-sm max-w-xs leading-relaxed" style={{ color: '#0A2F35', opacity: 0.7, fontFamily: 'var(--font-nunito)' }}>
            A database trigger needs to be removed before QR codes can be generated.
            Go to <strong>Supabase Dashboard → SQL Editor</strong> and run:
          </p>
          <pre className="text-left text-xs rounded-xl p-4 max-w-sm w-full overflow-x-auto" style={{ background: '#0A2F35', color: '#FFFBEB', fontFamily: 'monospace' }}>
{`DROP TRIGGER IF EXISTS sheets_walker_connections
  ON walker_connections;
DROP TRIGGER IF EXISTS sheets_dogs ON dogs;
DROP FUNCTION IF EXISTS public.send_sheets_webhook()
  CASCADE;`}
          </pre>
          <p className="text-xs" style={{ color: '#0A2F35', opacity: 0.5 }}>
            After running that SQL, come back and try again.
          </p>
          <a href="/setup" className="mt-2 text-sm font-semibold" style={{ color: 'oklch(0.48 0.17 196)' }}>← Back to setup</a>
        </div>
      )
    }

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
      otp={connection.otp ?? null}
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

function generateOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}
