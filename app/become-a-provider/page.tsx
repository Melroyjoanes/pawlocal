'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Suspense } from 'react'

const EASE = { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } as const

const CLAY_CARD = {
  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
  boxShadow:
    'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
  border: '1px solid rgba(226,220,200,0.7)',
} as const

const TEAL = 'oklch(0.48 0.17 196)'
const TEAL_DEEP = 'oklch(0.35 0.14 196)'

const TEXT = {
  en: {
    title: 'Set up your provider profile',
    subtitle: "You're almost ready to send reports. Just fill in a few details.",
    name_label: 'Your name',
    name_placeholder: 'Full name',
    whatsapp_label: 'WhatsApp number',
    whatsapp_placeholder: '9876543210',
    role_label: 'I am a',
    role_walker: 'Dog Walker',
    role_groomer: 'Groomer',
    role_caretaker: 'Pet Caretaker',
    submit_btn: 'Continue',
    submitting: 'Setting up…',
    toggle_lang: 'हिंदी',
    error_name: 'Please enter your name',
    error_whatsapp: 'Enter a valid 10-digit WhatsApp number',
    error_generic: 'Something went wrong. Please try again.',
    trust: 'Free to use · Your info is only shared with pet owners',
  },
  hi: {
    title: 'Apna provider profile banao',
    subtitle: 'Reports bhejne ke liye ready ho jao. Bas kuch details bharo.',
    name_label: 'Aapka naam',
    name_placeholder: 'Poora naam',
    whatsapp_label: 'WhatsApp number',
    whatsapp_placeholder: '9876543210',
    role_label: 'Main hoon ek',
    role_walker: 'Dog Walker',
    role_groomer: 'Groomer',
    role_caretaker: 'Pet Caretaker',
    submit_btn: 'Aage badho',
    submitting: 'Set ho raha hai…',
    toggle_lang: 'English',
    error_name: 'Apna naam dalo',
    error_whatsapp: '10-digit WhatsApp number dalo',
    error_generic: 'Kuch gadbad ho gayi. Dobara try karo.',
    trust: 'Bilkul free · Aapki info sirf pet owners ke saath share hogi',
  },
}

const ROLES = [
  { value: 'dog-walking', labelKey: 'role_walker' as const },
  { value: 'grooming', labelKey: 'role_groomer' as const },
  { value: 'pet-sitting', labelKey: 'role_caretaker' as const },
]

function BecomeAProviderForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const inviteToken = searchParams.get('invite_token') ?? ''

  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [role, setRole] = useState<string>('dog-walking')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = TEXT[lang]

  // Pre-fill name from Google session
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const fullName =
        data?.user?.user_metadata?.full_name ??
        data?.user?.user_metadata?.name ??
        ''
      if (fullName) setName(fullName)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError(t.error_name); return }
    const cleanWA = whatsapp.replace(/\D/g, '')
    if (cleanWA.length !== 10) { setError(t.error_whatsapp); return }

    setLoading(true)
    try {
      const res = await fetch('/api/become-a-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          whatsapp: cleanWA,
          role,
          invite_token: inviteToken,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? t.error_generic)
        setLoading(false)
        return
      }

      // Success — go to linking step
      if (inviteToken) {
        router.push(`/join-as-provider/${inviteToken}/link`)
      } else {
        router.push('/pro/dashboard')
      }
    } catch {
      setError(t.error_generic)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center px-4 py-8"
      style={{ background: '#FFFBEB' }}
    >
      <div className="w-full max-w-md">

        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={EASE}
        >
          <Image src="/logo.webp" alt="PupStep" width={120} height={44} className="h-9 w-auto" />
          <button
            onClick={() => setLang(l => (l === 'en' ? 'hi' : 'en'))}
            className="text-xs font-bold px-3 py-1.5 rounded-full border transition-colors"
            style={{ borderColor: 'rgba(226,220,200,0.9)', color: TEAL, background: 'white' }}
          >
            {t.toggle_lang}
          </button>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={EASE}
          className="rounded-3xl p-6 mb-4"
          style={CLAY_CARD}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: 'oklch(0.94 0.06 196)' }}
            >
              🐾
            </div>
            <div>
              <h1 className="font-display text-xl text-stone-900 leading-tight">{t.title}</h1>
              <p className="text-xs text-stone-400 mt-0.5">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                {t.name_label}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t.name_placeholder}
                className="w-full rounded-2xl px-4 py-3.5 text-sm text-stone-900 placeholder:text-stone-300 outline-none focus:ring-2 transition-all"
                style={{
                  background: '#fafaf8',
                  border: '1px solid rgba(226,220,200,0.8)',
                  // @ts-expect-error ring color custom prop
                  '--tw-ring-color': TEAL,
                }}
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                {t.whatsapp_label}
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
                  style={{ color: TEAL }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder={t.whatsapp_placeholder}
                  className="w-full rounded-2xl pl-12 pr-4 py-3.5 text-sm text-stone-900 placeholder:text-stone-300 outline-none focus:ring-2 transition-all"
                  style={{
                    background: '#fafaf8',
                    border: '1px solid rgba(226,220,200,0.8)',
                    // @ts-expect-error ring color custom prop
                    '--tw-ring-color': TEAL,
                  }}
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
                {t.role_label}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className="py-3 rounded-2xl text-xs font-bold transition-all"
                    style={
                      role === r.value
                        ? { background: TEAL, color: 'white', boxShadow: `0 3px 0 ${TEAL_DEEP}` }
                        : {
                            background: '#fafaf8',
                            color: '#78716c',
                            border: '1px solid rgba(226,220,200,0.8)',
                          }
                    }
                  >
                    {t[r.labelKey]}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500 font-medium"
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-opacity disabled:opacity-60"
              style={{ background: TEAL, boxShadow: `0 4px 0 ${TEAL_DEEP}` }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.12 }}
            >
              {loading ? t.submitting : t.submit_btn}
            </motion.button>
          </form>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...EASE, delay: 0.2 }}
          className="text-center text-xs text-stone-400"
        >
          {t.trust}
        </motion.p>
      </div>
    </div>
  )
}

// Wrap in Suspense because useSearchParams() requires it in Next.js 15
export default function BecomeAProviderPage() {
  return (
    <Suspense>
      <BecomeAProviderForm />
    </Suspense>
  )
}
