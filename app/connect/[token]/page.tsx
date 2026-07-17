import { redirect } from 'next/navigation'
import { getConnectionByToken } from '@/lib/getConnectionByToken'
import ConnectClient from './ConnectClient'

interface ConnectPageProps {
  params: Promise<{ token: string }>
}

export default async function ConnectPage({ params }: ConnectPageProps) {
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
          QR Code Not Found
        </h1>
        <p className="text-slate-500 text-sm">
          This QR code is invalid or has expired. Ask the pet parent to generate a new one.
        </p>
      </div>
    )
  }

  if (data.status === 'active') {
    redirect(`/walker/${token}`)
  }

  return (
    <ConnectClient
      token={token}
      dogName={data.dogName}
      dogBreed={data.dogBreed}
      dogPhoto={data.dogPhoto}
      healthNotes={data.healthNotes}
      ownerFirstName={data.ownerFirstName}
      isClaimed={data.status === 'active'}
      expectedWalkerPhone={data.expectedWalkerPhone ?? null}
    />
  )
}
