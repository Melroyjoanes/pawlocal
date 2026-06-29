'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// expo-out — smooth deceleration, never bouncy
const EXPO_OUT = [0.16, 1, 0.3, 1] as const

function HamburgerIcon() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden>
      <rect x="0" y="0"  width="22" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="0" y="6.5" width="22" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="0" y="13" width="15" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}


const EYEBROW = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
  color: 'oklch(0.65 0.18 75)', paddingLeft: 4, marginBottom: 10,
}

const CHIP_SHADOW = 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.07)'

export default function MobileDrawer() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // — Auth state —
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  // — Body scroll lock —
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? ''
  const firstName   = displayName.split(' ')[0]
  const avatarUrl   = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture
  const initials    = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const dashHref    = '/home'

  return (
    <>
      {/* ── Hamburger trigger — mobile only ── */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-11 h-11 rounded-xl text-stone-700 hover:bg-amber-50 active:bg-amber-100 transition-colors flex-shrink-0"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <HamburgerIcon />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* ── Backdrop ── */}
            <motion.div
              key="bd"
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(15,30,20,0.48)', backdropFilter: 'blur(2px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            />

            {/* ── Drawer panel ── */}
            <motion.aside
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="fixed inset-y-0 left-0 z-50 flex flex-col w-72"
              style={{
                background: 'oklch(0.988 0.018 88)',
                boxShadow: '8px 0 48px rgba(15,45,50,0.2)',
                willChange: 'transform',
              }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%', transition: { duration: 0.22, ease: [0.7, 0, 0.84, 0] } }}
              transition={{ duration: 0.34, ease: EXPO_OUT }}
            >

              {/* ── Teal identity header ── */}
              <div
                className="flex-shrink-0 relative"
                style={{ background: 'linear-gradient(145deg, oklch(0.50 0.17 194), oklch(0.38 0.15 199))' }}
              >
                {/* Close — always top-right of the teal band */}
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-10"
                  style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)' }}
                  aria-label="Close menu"
                >
                  <CloseIcon />
                </button>

                {user ? (
                  /* Signed-in identity strip */
                  <a
                    href={dashHref}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3.5 px-5 pt-5 pb-5 pr-14"
                  >
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2"
                      style={{ borderColor: 'rgba(255,255,255,0.35)' }}
                    >
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold"
                          style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                          {initials || '🐶'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-[15px] leading-snug truncate">
                        Hey, {firstName || 'there'}! 🐾
                      </p>
                      <p className="text-white/65 text-[12px] mt-0.5">
                        View my dashboard →
                      </p>
                    </div>
                  </a>
                ) : (
                  /* Guest welcome */
                  <div className="px-5 pt-5 pb-5 pr-14">
                    <p className="text-white font-semibold text-[15px] leading-snug mb-0.5">
                      Welcome to PupStep 🐶
                    </p>
                    <p className="text-white/60 text-[12px] mb-3.5">
                      GPS walk reports for Mumbai dogs
                    </p>
                    <a
                      href="/login?next=/home"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-[13px] transition-opacity hover:opacity-90"
                      style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
                    >
                      Sign in →
                    </a>
                  </div>
                )}
              </div>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="px-4 pt-5 pb-4 space-y-6">

                  {/* Quick links */}
                  <section>
                    <p style={EYEBROW}>Quick links</p>
                    <nav>
                      {[
                        { href: '/blog',    icon: '📝', label: 'Blog' },
                        { href: '/faq',     icon: '❓', label: 'FAQs' },
                        { href: '/contact', icon: '💬', label: 'Contact us' },
                      ].map(({ href, icon, label }) => (
                        <a
                          key={href}
                          href={href}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-2 py-[11px] rounded-xl hover:bg-amber-50 active:bg-amber-100 transition-colors"
                        >
                          <span className="text-[18px] w-7 text-center leading-none flex-shrink-0">{icon}</span>
                          <span className="text-[14px] font-medium text-stone-700">{label}</span>
                        </a>
                      ))}
                    </nav>
                  </section>

                  {/* My stuff — signed in only */}
                  {user && (
                    <section>
                      <p style={EYEBROW}>My stuff</p>
                      <nav>
                        <>
                          <a href="/home" onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-2 py-[11px] rounded-xl hover:bg-amber-50 active:bg-amber-100 transition-colors">
                            <span className="text-[18px] w-7 text-center leading-none flex-shrink-0">🏠</span>
                            <span className="text-[14px] font-medium text-stone-700">My home</span>
                          </a>
                          <a href="/my-reports" onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-2 py-[11px] rounded-xl hover:bg-amber-50 active:bg-amber-100 transition-colors">
                            <span className="text-[18px] w-7 text-center leading-none flex-shrink-0">📋</span>
                            <span className="text-[14px] font-medium text-stone-700">Walk reports</span>
                          </a>
                          <a href="/my-account" onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-2 py-[11px] rounded-xl hover:bg-amber-50 active:bg-amber-100 transition-colors">
                            <span className="text-[18px] w-7 text-center leading-none flex-shrink-0">👤</span>
                            <span className="text-[14px] font-medium text-stone-700">My account</span>
                          </a>
                        </>
                      </nav>
                    </section>
                  )}

                </div>
              </div>

              {/* Sign out lives in the account dashboard — not duplicated here */}

            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
