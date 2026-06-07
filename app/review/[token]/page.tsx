import { notFound } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ReviewByToken from './ReviewByToken'

type Props = {
  params: Promise<{ token: string }>
}

export default async function ReviewTokenPage({ params }: Props) {
  const { token } = await params

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Look up invite by token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite } = await (admin.from('review_invites') as any)
    .select('id, provider_id, used')
    .eq('token', token)
    .single()

  if (!invite) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-border p-8 shadow-sm text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Link not found
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            This link has expired or already been used. Ask the provider for a new one.
          </p>
        </div>
      </div>
    )
  }

  if (invite.used) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-border p-8 shadow-sm text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Already used
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            This review link has already been used. Ask the provider to generate a new one.
          </p>
        </div>
      </div>
    )
  }

  // Fetch provider name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('name')
    .eq('id', invite.provider_id)
    .single()

  if (!provider) notFound()

  return (
    <ReviewByToken
      token={token}
      providerId={invite.provider_id}
      providerName={provider.name}
    />
  )
}
