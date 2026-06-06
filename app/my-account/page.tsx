import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MyAccountClient from './MyAccountClient'

interface SavedProvider {
  id: string
  name: string
  category_slug: string
  whatsapp: string
}

export default async function MyAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware handles redirect for unauthenticated users, but double-check here
  if (!user) {
    redirect('/?auth_required=1&next=/my-account')
  }

  // Derive phone for lookup — strip country code
  const rawPhone = user.phone ?? ''
  const normalizedPhone = rawPhone.replace(/\D/g, '').replace(/^91/, '')

  // Fetch broadcasts — by user_id first (works after migration 017), then fall back to phone
  let broadcasts: {
    id: string; service_slug: string; pet_description: string;
    area: string; date_needed: string; budget: string | null;
    status: string; created_at: string;
  }[] = []

  // Try by user_id first (works after migration 017 when user_id is set on broadcasts)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: broadcastsByUser } = await (supabase.from('broadcasts') as any)
    .select('id, service_slug, pet_description, area, date_needed, budget, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (broadcastsByUser && broadcastsByUser.length > 0) {
    broadcasts = broadcastsByUser
  } else if (normalizedPhone.length >= 10) {
    // Fallback: match by phone for older broadcasts
    const { data } = await supabase
      .from('broadcasts')
      .select('id, service_slug, pet_description, area, date_needed, budget, status, created_at')
      .ilike('poster_whatsapp', `%${normalizedPhone}%`)
      .order('created_at', { ascending: false })
    broadcasts = data ?? []
  }

  // Fetch reviews
  let reviews: {
    id: string; provider_id: string; rating: number; comment: string | null;
    created_at: string; providers?: { name: string };
  }[] = []

  if (normalizedPhone.length >= 10) {
    const { data } = await supabase
      .from('reviews')
      .select('id, provider_id, rating, comment, created_at, providers(name)')
      .ilike('reviewer_phone', `%${normalizedPhone}%`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    // Cast because Supabase returns nested as array for joined tables
    reviews = (data ?? []) as unknown as typeof reviews
  }

  // Saved providers come from localStorage — server can't read it, so pass empty array
  // MyAccountClient will hydrate from localStorage on mount
  const savedProviders: SavedProvider[] = []

  const userMeta = user.user_metadata ?? {}
  const userDisplay =
    userMeta.full_name ??
    userMeta.name ??
    (normalizedPhone.length >= 10 ? `+91 ${normalizedPhone}` : user.email ?? 'Your account')

  const userAvatar: string | null = userMeta.avatar_url ?? userMeta.picture ?? null

  return (
    <MyAccountClient
      broadcasts={broadcasts}
      reviews={reviews}
      savedProviders={savedProviders}
      userDisplay={userDisplay}
      userAvatar={userAvatar}
      userId={user.id}
    />
  )
}
