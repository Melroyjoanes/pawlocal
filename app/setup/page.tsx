import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import SetupClient from './SetupClient'

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ just_paid?: string; recover?: string }>
}) {
  const { just_paid, recover } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, check if they already have a dog — if so, skip setup and go to QR
  // This prevents creating duplicate dogs when parent navigates back from QR page
  if (user && !just_paid) {
    try {
      const db = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingDog } = await (db.from('dogs') as any)
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (existingDog?.id) {
        // Dog already exists — redirect to QR so they don't create a duplicate
        redirect(`/setup/qr?dog=${existingDog.id}`)
      }
    } catch {
      // If check fails, just show the form — safe fallback
    }
  }

  return (
    <SetupClient
      user={user ? {
        id: user.id,
        fullName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      } : null}
      justPaid={just_paid === '1'}
      recover={recover === '1'}
    />
  )
}
