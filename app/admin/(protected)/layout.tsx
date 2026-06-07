import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'melroy@verfolia.com'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → login page
  if (!user) redirect('/admin/login')

  // Logged in but not admin → kick to home silently (don't reveal /admin exists)
  if (user.email !== ADMIN_EMAIL) redirect('/')

  return <>{children}</>
}
