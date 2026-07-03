import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getConnectionByToken } from '@/lib/getConnectionByToken'
import { computeStreak, fourteenDaysAgoIST } from '@/lib/streak'
import WalkerClient from './WalkerClient'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface WalkerPageProps {
  params: Promise<{ token: string }>
}

export default async function WalkerPage({ params }: WalkerPageProps) {
  const { token } = await params

  // Call the DB lookup directly instead of `fetch()`-ing our own /api/connect/[token]
  // route — the old approach added an unnecessary extra HTTP round-trip (and a second
  // serverless function invocation) to every single load of this page.
  const data = await getConnectionByToken(token)

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: '#FFFBEB' }}>
        <div className="text-6xl mb-4">🐾</div>
        <h1 className="text-xl font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
          Invalid Link
        </h1>
        <p className="text-slate-500 text-sm">
          This link is invalid or has expired. Ask the pet owner for the correct link.
        </p>
      </div>
    )
  }

  if (data.status === 'pending') {
    redirect(`/connect/${token}`)
  }

  // Walker's own logging streak — same computeStreak logic used on the parent's
  // Home screen, but scoped to walks this walker has logged for this connection.
  let walkerStreak = 0
  try {
    const db = admin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentLogs } = await (db.from('walk_logs') as any)
      .select('started_at')
      .eq('connection_id', data.id)
      .gte('started_at', fourteenDaysAgoIST())
      .order('started_at', { ascending: false })
    walkerStreak = computeStreak(recentLogs ?? [])
  } catch (err) {
    console.error('[walker page] streak calc failed:', err)
  }

  return (
    <WalkerClient
      token={token}
      dogName={data.dogName}
      dogBreed={data.dogBreed}
      dogPhotoUrl={data.dogPhoto ?? null}
      healthNotes={data.healthNotes}
      ownerFirstName={data.ownerFirstName}
      walkerName={data.walkerName ?? 'Walker'}
      walkerPhone={data.walkerPhone ?? null}
      walkerRole={data.walkerRole ?? null}
      ownerPhone={data.ownerPhone ?? null}
      careFocus={data.careFocus ?? 'normal'}
      walkerStreak={walkerStreak}
    />
  )
}
