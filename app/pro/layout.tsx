import { type ReactNode } from 'react'
import ProBottomNav from './ProBottomNav'
import { createClient } from '@/lib/supabase/server'
// Do NOT import the main site Header or Footer

export default async function ProLayout({ children }: { children: ReactNode }) {
  // Only show bottom nav when a session exists (i.e. provider is logged in)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-dvh bg-stone-50">
      {children}
      {user && <ProBottomNav />}
    </div>
  )
}
