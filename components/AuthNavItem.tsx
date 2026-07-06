'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function AuthNavItem() {
  const [user, setUser] = useState<User | null>(null)
  const [isProvider, setIsProvider] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function load(u: User | null) {
      setUser(u)
      if (u?.email) {
        // Check if this user is an approved provider — single indexed query
        const { data } = await supabase
          .from('providers')
          .select('id')
          .eq('email', u.email)
          .eq('status', 'approved')
          .maybeSingle()
        setIsProvider(!!data)
      } else {
        setIsProvider(false)
      }
      setReady(true)
    }

    supabase.auth.getUser().then(({ data }) => load(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return null

  if (user) {
    const avatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture
    const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? ''
    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    // Providers go to their dashboard, pet owners go to account
    const accountHref = isProvider ? '/pro/dashboard' : '/account'

    return (
      <a
        href={accountHref}
        className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-amber-50 transition-all"
        title={isProvider ? 'Provider dashboard' : name}
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
          {isProvider ? 'My dashboard' : name.split(' ')[0]}
        </span>
      </a>
    )
  }

  return (
    <a
      href="/login?next=/home"
      className="text-sm font-bold px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 transition-transform active:scale-[0.97]"
      style={{
        background: 'linear-gradient(155deg,#FF8C52,#F56B22)',
        color: '#451A03',
        fontFamily: 'var(--font-nunito)',
        boxShadow: [
          'inset 0 1.5px 0 rgba(255,255,255,0.45)',
          'inset 0 -2px 0 rgba(175,65,10,0.25)',
          '0 4px 12px rgba(245,107,34,0.32)',
        ].join(', '),
      }}
    >
      Sign in
    </a>
  )
}
