import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro')

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <div className="text-4xl mb-4">🐾</div>
      <h1 className="text-2xl font-bold mb-2">Welcome to your dashboard</h1>
      <p className="text-muted-foreground text-sm">Full dashboard coming shortly.</p>
    </div>
  )
}
