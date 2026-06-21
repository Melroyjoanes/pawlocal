import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import JoinProClient from './JoinProClient'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function JoinProPage({ params }: Props) {
  const { id } = await params

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch provider info (public — no auth needed to view)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (admin.from('providers') as any)
    .select('id, name, category_slug, neighbourhood, provider_photos(url, is_primary)')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!provider) return notFound()

  // Check if user is already signed in
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const photos = provider.provider_photos as { url: string; is_primary: boolean }[] | null
  const primaryPhoto = photos?.find((p) => p.is_primary)?.url ?? photos?.[0]?.url ?? null

  return (
    <JoinProClient
      providerId={provider.id}
      providerName={provider.name}
      providerPhoto={primaryPhoto}
      categorySlug={provider.category_slug}
      neighbourhood={provider.neighbourhood}
      isLoggedIn={!!user}
      userEmail={user?.email ?? null}
    />
  )
}
