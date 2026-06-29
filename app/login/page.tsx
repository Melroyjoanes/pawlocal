import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginClient from './LoginClient'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Already logged in — redirect to destination or home
  if (user) {
    redirect(next && next.startsWith('/') ? next : '/home')
  }

  return <LoginClient next={next ?? '/home'} />
}
