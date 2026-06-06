'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function AuthNavItem() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // Get initial session
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setReady(true)
    })
    // Listen for changes (sign-in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return null // avoid flash

  if (user) {
    const avatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture
    const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? ''
    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

    return (
      <a
        href="/account"
        className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-amber-50 transition-all"
        title={name}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
            {initials || '?'}
          </div>
        )}
        <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-[100px] truncate">
          {name.split(' ')[0]}
        </span>
      </a>
    )
  }

  return (
    <a
      href="/account"
      className="text-sm font-medium px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-amber-50 transition-all border border-border"
    >
      Sign in
    </a>
  )
}
