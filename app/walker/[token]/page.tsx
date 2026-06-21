import { redirect } from 'next/navigation'
import WalkerClient from './WalkerClient'

interface WalkerPageProps {
  params: Promise<{ token: string }>
}

export default async function WalkerPage({ params }: WalkerPageProps) {
  const { token } = await params

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/connect/${token}`, { cache: 'no-store' })

  if (!res.ok) {
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

  const data = await res.json()

  if (data.status === 'pending') {
    redirect(`/connect/${token}`)
  }

  return (
    <WalkerClient
      token={token}
      dogName={data.dogName}
      dogBreed={data.dogBreed}
      healthNotes={data.healthNotes}
      ownerFirstName={data.ownerFirstName}
      walkerName={data.walkerName ?? 'Walker'}
      ownerPhone={data.ownerPhone ?? null}
    />
  )
}
