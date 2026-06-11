import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → login page
  if (!user) redirect('/admin/login')

  // ADMIN_EMAIL must be set in env — no hardcoded fallback so misconfiguration fails closed
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || user.email !== adminEmail) redirect('/')

  return <>{children}</>
}
