'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

const ROLES = [
  { value: 'walker', label: 'Walker', emoji: '🦮' },
  { value: 'groomer', label: 'Groomer', emoji: '✂️' },
  { value: 'caretaker', label: 'Caretaker', emoji: '🏡' },
] as const

type Role = 'walker' | 'groomer' | 'caretaker'

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          animate={{
            width: i === current ? 24 : 8,
            background: i === current ? 'oklch(0.48 0.17 196)' : 'rgba(0,0,0,0.12)',
          }}
          style={{ height: 8 }}
          transition={{ duration: 0.3, ease: EASE }}
        />
      ))}
    </div>
  )
}

export default function OnboardingClient({ userName }: { userName: string }) {
  const [step, setStep] = useState(0)
  const [dogName, setDogName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [role, setRole] = useState<Role>('walker')
  const [loading, setLoading] = useState(false)
  const [direction, setDirection] = useState(1)

  function goNext() {
    setDirection(1)
    setStep(s => s + 1)
  }

  async function handleStep2Submit() {
    setLoading(true)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_name: dogName, role, whatsapp_number: whatsapp }),
      })
      const data = await res.json()

      // Track event
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'onboarding_completed', role }),
      }).catch(() => {})

      // Mark onboarding complete
      fetch('/api/onboarding-complete', { method: 'POST' }).catch(() => {})

      // Open WhatsApp if link returned
      if (data?.whatsapp_link) {
        window.open(data.whatsapp_link, '_blank')
      }

      goNext()
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSkip() {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'onboarding_skipped' }),
    }).catch(() => {})
    fetch('/api/onboarding-complete', { method: 'POST' }).catch(() => {})
    window.location.href = '/my-reports'
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-8"
      style={{ background: '#FFFBEB' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo / brand wordmark */}
        <div className="text-center mb-6">
          <span className="text-2xl font-display" style={{ color: 'oklch(0.48 0.17 196)' }}>PupStep</span>
        </div>

        {/* Step dots — hidden on celebration step */}
        {step < 2 && <StepDots current={step} total={2} />}

        {/* Sliding step container */}
        <div className="relative overflow-hidden">
          <AnimatePresence custom={direction} mode="wait">

            {/* ── Step 0: Dog name ─────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step0"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: EASE }}
              >
                <div
                  className="rounded-3xl p-7"
                  style={{
                    background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 8px 28px rgba(15,45,50,0.09)',
                    border: '1px solid rgba(226,220,200,0.7)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <motion.span
                      className="text-5xl"
                      animate={{ rotate: [0, -10, 10, -6, 0] }}
                      transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
                      style={{ display: 'inline-block' }}
                    >
                      🐶
                    </motion.span>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-0.5">Step 1 of 2</p>
                      <h1 className="font-display text-2xl text-stone-900 leading-tight">
                        What&apos;s your dog&apos;s name?
                      </h1>
                    </div>
                  </div>

                  <p className="text-sm text-stone-500 mb-5 leading-relaxed">
                    Hi {userName}! Let&apos;s get your pup set up. We&apos;ll use this to personalise your reports.
                  </p>

                  <input
                    type="text"
                    placeholder="e.g. Bruno, Coco, Max…"
                    value={dogName}
                    onChange={e => setDogName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && dogName.trim() && goNext()}
                    autoFocus
                    className="w-full px-4 py-4 rounded-2xl text-xl font-display text-stone-900 placeholder:text-stone-300 outline-none"
                    style={{
                      background: 'oklch(0.97 0.01 85)',
                      border: '2px solid rgba(226,220,200,0.8)',
                    }}
                  />

                  <motion.button
                    onClick={goNext}
                    disabled={!dogName.trim()}
                    className="mt-5 w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40"
                    style={{
                      background: 'oklch(0.48 0.17 196)',
                      boxShadow: dogName.trim() ? '0 4px 0 oklch(0.35 0.14 196)' : 'none',
                    }}
                    whileTap={dogName.trim() ? { scale: 0.97 } : {}}
                    transition={{ duration: 0.12 }}
                  >
                    Continue →
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Walker's WhatsApp ─────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: EASE }}
              >
                <div
                  className="rounded-3xl p-7"
                  style={{
                    background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 8px 28px rgba(15,45,50,0.09)',
                    border: '1px solid rgba(226,220,200,0.7)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl">📱</span>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-0.5">Step 2 of 2</p>
                      <h1 className="font-display text-2xl text-stone-900 leading-tight">
                        Who walks {dogName || 'your pup'}?
                      </h1>
                    </div>
                  </div>

                  <p className="text-sm text-stone-500 mb-5 leading-relaxed">
                    We&apos;ll send them a link to set up their PupStep account and start sending you reports.
                  </p>

                  {/* Role selector */}
                  <div className="flex gap-2 mb-4">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setRole(r.value)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: role === r.value ? 'oklch(0.48 0.17 196)' : 'oklch(0.97 0.01 85)',
                          color: role === r.value ? 'white' : 'oklch(0.35 0.08 196)',
                          border: role === r.value ? 'none' : '1.5px solid rgba(226,220,200,0.8)',
                        }}
                      >
                        {r.emoji} {r.label}
                      </button>
                    ))}
                  </div>

                  {/* WhatsApp input */}
                  <div className="relative mb-5">
                    <span
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold"
                      style={{ color: 'oklch(0.48 0.17 196)' }}
                    >
                      +91
                    </span>
                    <input
                      type="tel"
                      placeholder="WhatsApp number"
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onKeyDown={e => e.key === 'Enter' && whatsapp.length === 10 && handleStep2Submit()}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl text-base font-semibold text-stone-900 placeholder:text-stone-300 outline-none"
                      style={{
                        background: 'oklch(0.97 0.01 85)',
                        border: '2px solid rgba(226,220,200,0.8)',
                      }}
                    />
                  </div>

                  <motion.button
                    onClick={handleStep2Submit}
                    disabled={whatsapp.length !== 10 || loading}
                    className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(160deg, #25D366 0%, #1aad54 100%)',
                      boxShadow: whatsapp.length === 10 && !loading ? '0 4px 0 #0e6437' : 'none',
                    }}
                    whileTap={whatsapp.length === 10 ? { scale: 0.97 } : {}}
                    transition={{ duration: 0.12 }}
                  >
                    {loading ? 'Sending invite…' : 'Send WhatsApp invite →'}
                  </motion.button>

                  <button
                    onClick={handleSkip}
                    className="w-full mt-3 py-3 text-sm text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    I&apos;ll add my {role} later →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Celebration ───────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: EASE }}
              >
                <div
                  className="rounded-3xl p-8 text-center"
                  style={{
                    background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 8px 28px rgba(15,45,50,0.09)',
                    border: '1px solid rgba(226,220,200,0.7)',
                  }}
                >
                  {/* Animated paw */}
                  <motion.div
                    className="text-7xl mb-4"
                    initial={{ scale: 0.3, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                  >
                    🐾
                  </motion.div>

                  <motion.h2
                    className="font-display text-3xl text-stone-900 mb-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.25, ease: EASE }}
                  >
                    You&apos;re all set!
                  </motion.h2>

                  <motion.p
                    className="text-sm text-stone-500 leading-relaxed mb-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35, ease: EASE }}
                  >
                    Invite sent to your {role}. Once they accept, they&apos;ll start sending reports after every session.
                  </motion.p>

                  <motion.p
                    className="text-sm font-semibold mb-7"
                    style={{ color: 'oklch(0.48 0.17 196)' }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.42, ease: EASE }}
                  >
                    {dogName} will be well taken care of 🐕
                  </motion.p>

                  <motion.a
                    href="/my-reports"
                    className="block w-full py-4 rounded-2xl font-bold text-white text-base"
                    style={{
                      background: 'oklch(0.48 0.17 196)',
                      boxShadow: '0 4px 0 oklch(0.35 0.14 196)',
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5, ease: EASE }}
                    whileTap={{ scale: 0.97 }}
                  >
                    View my reports →
                  </motion.a>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}
