'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const CATEGORIES = [
  { slug: 'dog-walking',  icon: '🦮', name: 'Dog Walking',   color: '#4F46E5' },
  { slug: 'grooming',     icon: '✂️',  name: 'Grooming',      color: '#7C3AED' },
  { slug: 'vet',          icon: '🏥', name: 'Vet / Doctor',  color: '#DC2626' },
  { slug: 'pet-store',    icon: '🐾', name: 'Pet Store',     color: '#059669' },
  { slug: 'dog-training', icon: '🎯', name: 'Dog Training',  color: '#0891B2' },
  { slug: 'insurance',    icon: '🛡️',  name: 'Insurance',     color: '#D97706' },
]

export default function MobileDrawer() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isProvider, setIsProvider] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load(u: User | null) {
      setUser(u)
      if (u?.email) {
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
    }
    supabase.auth.getUser().then(({ data }) => load(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => load(s?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    window.location.href = '/'
  }

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? ''
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const dashboardHref = isProvider ? '/pro/dashboard' : '/my-account'

  return (
    <>
      {/* Hamburger trigger — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-xl hover:bg-amber-50 transition-colors flex-shrink-0"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <span className="block w-5 h-0.5 rounded-full bg-stone-600" />
        <span className="block w-5 h-0.5 rounded-full bg-stone-600" />
        <span className="block w-4 h-0.5 rounded-full bg-stone-600" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-50 bg-stone-900/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer panel */}
            <motion.aside
              key="drawer"
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col"
              style={{
                background: 'oklch(0.988 0.018 88)',
                boxShadow: '4px 0 40px rgba(0,0,0,0.15)',
              }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-safe-top pb-3 pt-4 border-b border-amber-100">
                <Image src="/logo.png" alt="PupStep" width={120} height={44} className="h-10 w-auto" />
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-500 hover:bg-amber-50 transition-colors text-lg"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              {/* User identity strip — if signed in */}
              {user && (
                <a
                  href={dashboardHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 border-b border-amber-100 hover:bg-amber-50/60 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-amber-200">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700">
                        {initials || '?'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-800 text-sm truncate">{displayName}</p>
                    <p className="text-xs text-stone-400 truncate">
                      {isProvider ? 'Provider dashboard →' : 'My account →'}
                    </p>
                  </div>
                </a>
              )}

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

                {/* Browse categories */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2.5 px-1">Browse</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => (
                      <a
                        key={cat.slug}
                        href={`/${cat.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-amber-100 bg-white/70 hover:bg-amber-50 transition-colors"
                      >
                        <span className="text-lg leading-none">{cat.icon}</span>
                        <span className="text-xs font-semibold text-stone-700 leading-tight">{cat.name}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Quick links */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2.5 px-1">Quick links</p>
                  <div className="space-y-1">
                    {[
                      { href: '/broadcast', icon: '📣', label: 'Post a request' },
                      { href: '/map',       icon: '📍', label: 'Near me (map)' },
                      { href: '/search',    icon: '🔍', label: 'Search' },
                    ].map(({ href, icon, label }) => (
                      <a
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-amber-50 transition-colors"
                      >
                        <span className="text-base w-6 text-center">{icon}</span>
                        <span className="text-sm font-medium text-stone-700">{label}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Account section — signed in */}
                {user && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2.5 px-1">My account</p>
                    <div className="space-y-1">
                      <a
                        href={dashboardHref}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-amber-50 transition-colors"
                      >
                        <span className="text-base w-6 text-center">{isProvider ? '🏠' : '🐶'}</span>
                        <span className="text-sm font-medium text-stone-700">
                          {isProvider ? 'Provider dashboard' : 'My account'}
                        </span>
                      </a>
                      {!isProvider && (
                        <a
                          href="/my-account"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-amber-50 transition-colors"
                        >
                          <span className="text-base w-6 text-center">🐾</span>
                          <span className="text-sm font-medium text-stone-700">Walk reports</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Sign in — guest */}
                {!user && (
                  <a
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm"
                    style={{ background: 'oklch(0.53 0.17 192)', color: 'white' }}
                  >
                    Sign in to PupStep
                  </a>
                )}
              </div>

              {/* Footer: sign out */}
              {user && (
                <div className="px-4 pb-safe-bottom pb-5 pt-3 border-t border-amber-100">
                  <button
                    onClick={signOut}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <span className="text-base w-6 text-center">→</span>
                    <span className="text-sm font-semibold">Sign out</span>
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
