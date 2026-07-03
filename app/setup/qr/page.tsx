import { randomBytes, randomInt } from 'crypto'
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
    redirect('/login?next=/setup/qr')
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
      console.error('[setup/qr] walker_connections insert failed:', insertErr.message)
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: '#FFFBEB' }}>
          <span className="text-5xl">🐾</span>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>
            Something went wrong
          </h1>
          <p className="text-sm max-w-xs leading-relaxed" style={{ color: '#0A2F35', opacity: 0.7, fontFamily: 'var(--font-nunito)' }}>
            We could not generate your QR code right now. Please try again in a moment.
          </p>
          <p className="text-sm" style={{ color: '#0A2F35', opacity: 0.55, fontFamily: 'var(--font-nunito)' }}>
            If this keeps happening, contact us at{' '}
            <a href="mailto:melroy@verfolia.com" style={{ color: 'oklch(0.48 0.17 196)', fontWeight: 700 }}>melroy@verfolia.com</a>
          </p>
          <a href="/setup/qr?dog={dogId}" className="mt-2 px-6 py-3 rounded-full font-bold text-white text-sm" style={{ background: '#FF8C52' }}>
            Try again →
          </a>
          <a href="/home" className="text-sm font-semibold" style={{ color: 'oklch(0.48 0.17 196)' }}>← Back to home</a>
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
  const bytes = randomBytes(16)
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

function generateOTP(): string {
  return String(randomInt(1000, 10000))
}
