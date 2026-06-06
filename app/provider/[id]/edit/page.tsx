import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCategoryBySlug } from '@/lib/categories'
import type { ProviderWithPhotos } from '@/lib/supabase/types'
import EditProviderClient from './EditProviderClient'

export default async function EditProviderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ setup?: string }>
}) {
  const { id } = await params
  const { setup } = await searchParams
  const supabase = await createClient()

  // Check who's signed in (proxy already ensures someone IS signed in)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data } = await supabase
    .from('providers')
    .select('*, provider_photos(*)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (!data) notFound()

  const provider = data as unknown as ProviderWithPhotos & { user_id?: string | null }
  const category = getCategoryBySlug(provider.category_slug)
  if (!category) notFound()

  // Owner check: only the linked Google account may edit
  // Unclaimed profiles are not editable from the web — admin links accounts first
  const isClaimed = !!provider.user_id
  const isOwner = isClaimed && provider.user_id === user.id

  if (!isClaimed || !isOwner) {
    // Not claimed, or claimed by someone else — hard 404, no information leak
    notFound()
  }

  return <EditProviderClient provider={provider} category={category} setupMode={setup === '1'} />
}
