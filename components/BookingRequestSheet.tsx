'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface Props {
  isOpen: boolean
  onClose: () => void
  providerId: string
  providerName: string
  categorySlug: string
}

const PET_TYPES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other']

const TIME_SLOTS = [
  'Early morning (6–9am)', 'Morning (9am–12pm)', 'Afternoon (12–4pm)',
  'Evening (4–7pm)', 'Flexible',
]

export default function BookingRequestSheet({
  isOpen, onClose, providerId, providerName, categorySlug,
}: Props) {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [form, setForm] = useState({
    pet_name: '',
    pet_type: 'Dog',
    date_needed: '',
    time_needed: 'Flexible',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsSignedIn(!!data.user)
      setAuthChecked(true)
    })
  }, [isOpen])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSubmitted(false)
      setSubmitError(null)
      setForm({ pet_name: '', pet_type: 'Dog', date_needed: '', time_needed: 'Flexible', notes: '' })
    }
  }, [isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    let whatsapp_url: string | null = null
    try {
      const res = await fetch('/api/booking-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          service_slug: categorySlug,
          ...form,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setSubmitError(json.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      const json = await res.json()
      whatsapp_url = json.whatsapp_url ?? null
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setSubmitted(true)

    // Open WhatsApp after brief success moment
    setTimeout(() => {
      if (whatsapp_url) {
        window.open(whatsapp_url, '_blank', 'noopener,noreferrer')
      }
      onClose()
    }, 1500)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92dvh] overflow-y-auto"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-stone-200 rounded-full" />
            </div>

            <div className="px-5 pb-4">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Send a Request
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">to {providerName}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-slate-500 hover:bg-stone-200 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>

              {!authChecked ? (
                <div className="py-10 flex justify-center">
                  <div className="w-6 h-6 border-2 border-[var(--pl-teal)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !isSignedIn ? (
                <div className="py-8 text-center">
                  <div className="text-4xl mb-3">🔒</div>
                  <p className="font-semibold text-slate-900 mb-1">Sign in to send a request</p>
                  <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
                    Free sign-in keeps a record of all your requests in one place.
                  </p>
                  <a
                    href={`/account?next=/provider/${providerId}`}
                    className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white"
                    style={{ backgroundColor: 'oklch(0.48 0.17 196)' }}
                  >
                    Sign in free →
                  </a>
                </div>
              ) : submitted ? (
                <div className="py-10 text-center">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="font-semibold text-slate-900 text-lg mb-1">Request sent!</p>
                  <p className="text-sm text-muted-foreground">Opening WhatsApp to complete your booking…</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Pet type chips */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Your pet</label>
                    <div className="flex flex-wrap gap-2">
                      {PET_TYPES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, pet_type: t }))}
                          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            form.pet_type === t
                              ? 'bg-[var(--pl-teal)] text-white border-transparent'
                              : 'bg-white text-slate-700 border-stone-200 hover:border-[var(--pl-teal)]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pet name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Pet name <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.pet_name}
                      onChange={e => setForm(f => ({ ...f, pet_name: e.target.value }))}
                      placeholder="e.g. Bruno"
                      maxLength={50}
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      When do you need this? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.date_needed}
                      onChange={e => setForm(f => ({ ...f, date_needed: e.target.value }))}
                      placeholder="e.g. This Saturday, Tomorrow, 15th June"
                      maxLength={80}
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
                    />
                  </div>

                  {/* Time slot */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Preferred time</label>
                    <div className="flex flex-wrap gap-2">
                      {TIME_SLOTS.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, time_needed: t }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            form.time_needed === t
                              ? 'bg-[var(--pl-teal)] text-white border-transparent'
                              : 'bg-white text-slate-600 border-stone-200 hover:border-[var(--pl-teal)]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Any special requirements? <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Allergies, breed, specific requirements…"
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white resize-none"
                    />
                  </div>

                  {submitError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !form.date_needed}
                    className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      '💬 Send Request on WhatsApp'
                    )}
                  </button>

                  <p className="text-[11px] text-center text-muted-foreground">
                    {providerName} will reply to you directly on WhatsApp · No booking fee
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
