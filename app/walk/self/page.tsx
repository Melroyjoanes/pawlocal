import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import SelfWalkClient from './SelfWalkClient'

export const dynamic = 'force-dynamic'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function SelfWalkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth_required=1&next=/walk/self')

  const db = admin()
  const { data: dogs } = await db
    .from('dogs')
    .select('id, name, photo_url')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  if (!dogs || dogs.length === 0) {
    // No dog yet — send them to setup first, this route needs a dog_id
    redirect('/setup?go=1')
  }

  return <SelfWalkClient dogs={dogs} />
}
