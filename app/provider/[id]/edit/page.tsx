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

  const { data } = await supabase
    .from('providers')
    .select('*, provider_photos(*)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (!data) notFound()

  const provider = data as unknown as ProviderWithPhotos
  const category = getCategoryBySlug(provider.category_slug)
  if (!category) notFound()

  return <EditProviderClient provider={provider} category={category} setupMode={setup === '1'} />
}
