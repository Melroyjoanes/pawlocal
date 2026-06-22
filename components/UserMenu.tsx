'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import AuthModal from './AuthModal'

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function signOut() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    window.location.href = '/?signed_out=1'
  }

  if (loading) return <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse" />

  // Logged out — show account icon that opens AuthModal
  if (!user) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:bg-amber-50 transition-all flex-shrink-0"
          aria-label="Sign in"
        >
          👤
        </button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    )
  }

  // Logged in — show avatar + dropdown
  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'You'
  const avatarUrl = user.user_metadata?.avatar_url
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(v => !v)}
        className="w-9 h-9 rounded-full overflow-hidden border-2 border-amber-300 hover:border-amber-400 transition-colors flex items-center justify-center text-sm font-bold"
        style={{ backgroundColor: 'var(--pl-amber-light)', color: 'var(--pl-amber)' }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          : initials}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-border shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email ?? user.phone}</p>
          </div>
          <div className="py-1">
            <a href="/home" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              🏠 My home
            </a>
            <a href="/my-account" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              🐶 My account
            </a>
            <a href="/my-listing" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              🏪 My listing
            </a>
            <button onClick={signOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
              → Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
