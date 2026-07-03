import { redirect } from 'next/navigation'
import { getConnectionByToken } from '@/lib/getConnectionByToken'
import WalkerClient from './WalkerClient'

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
    />
  )
}
