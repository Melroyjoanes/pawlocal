'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'pawlocal_provider_onboarded_v1'

const STEPS = [
  {
    emoji: '🦮',
    title: 'Start a walk or grooming',
    desc: 'Tap the big button at the top. GPS will track the route automatically.',
  },
  {
    emoji: '📋',
    title: 'Fill in the dog\'s name',
    desc: 'After the session ends, just enter the dog\'s name. Everything else is auto-filled.',
  },
  {
    emoji: '📲',
    title: 'Share on WhatsApp',
    desc: 'Tap "Share on WhatsApp" — the pet parent gets a beautiful care card instantly.',
  },
]

export default function OnboardingOverlay({ isGroomer }: { isGroomer: boolean }) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) setVisible(true)
    } catch {
      // localStorage unavailable — skip
    }
  }, [])

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8"
          style={{ background: 'rgba(15, 23, 20, 0.65)', backdropFilter: 'blur(4px)' }}
          onClick={dismiss}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl p-7 flex flex-col items-center text-center"
            style={{
              background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
            }}
          >
            {/* Step indicator */}
            <div className="flex gap-1.5 mb-6">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 20 : 6,
                    height: 6,
                    background: i === step ? 'oklch(0.48 0.17 196)' : '#e5e7eb',
                  }}
                />
              ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex flex-col items-center"
              >
                <div className="text-6xl mb-5">{STEPS[step].emoji}</div>
                <h2 className="text-xl font-bold text-stone-900 mb-3 leading-tight">
                  {STEPS[step].title}
                </h2>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {STEPS[step].desc}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* CTA */}
            <button
              onClick={next}
              className="mt-8 w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
                boxShadow: '0 4px 0px oklch(0.35 0.14 196), 0 8px 24px oklch(0.48 0.17 196 / 0.25)',
              }}
            >
              {step < STEPS.length - 1 ? 'Next →' : 'Got it, let\'s go! 🐾'}
            </button>

            <button
              onClick={dismiss}
              className="mt-3 text-xs text-stone-400 font-medium py-1"
            >
              Skip
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
