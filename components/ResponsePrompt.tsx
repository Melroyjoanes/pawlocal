'use client'

import { useEffect, useState, useCallback } from 'react'

interface PendingContact {
  contact_id: string
  provider_id: string
  provider_name: string
  created_at: number
  prompt_sent_at?: number
}

type Step = 'responded' | 'booked' | 'thankyou'

const TWENTY_FOUR_HOURS = 86_400_000
const TWELVE_HOURS = 43_200_000

export default function ResponsePrompt() {
  const [visible, setVisible] = useState(false)
  const [contact, setContact] = useState<PendingContact | null>(null)
  const [step, setStep] = useState<Step>('responded')

  const findPendingContact = useCallback(() => {
    try {
      const raw = localStorage.getItem('pawlocal_pending_contacts')
      if (!raw) return null

      const list: PendingContact[] = JSON.parse(raw)
      const now = Date.now()

      // Find oldest contact that:
      // 1. Is at least 24h old
      // 2. Has no prompt_sent_at OR prompt was sent >12h ago (remind me later)
      const eligible = list
        .filter(c => {
          const isOldEnough = now - c.created_at >= TWENTY_FOUR_HOURS
          const notRecentlyPrompted = !c.prompt_sent_at || (now - c.prompt_sent_at >= TWELVE_HOURS)
          return isOldEnough && notRecentlyPrompted
        })
        .sort((a, b) => a.created_at - b.created_at)

      return eligible[0] ?? null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const pending = findPendingContact()
    if (pending) {
      setContact(pending)
      setStep('responded')
      setVisible(true)
    }
  }, [findPendingContact])

  function markPromptSent(contactId: string) {
    try {
      const raw = localStorage.getItem('pawlocal_pending_contacts')
      if (!raw) return
      const list: PendingContact[] = JSON.parse(raw)
      const updated = list.map(c =>
        c.contact_id === contactId ? { ...c, prompt_sent_at: Date.now() } : c
      )
      localStorage.setItem('pawlocal_pending_contacts', JSON.stringify(updated))
    } catch {}
  }

  function removeFromStorage(contactId: string) {
    try {
      const raw = localStorage.getItem('pawlocal_pending_contacts')
      if (!raw) return
      const list: PendingContact[] = JSON.parse(raw)
      const updated = list.filter(c => c.contact_id !== contactId)
      localStorage.setItem('pawlocal_pending_contacts', JSON.stringify(updated))
    } catch {}
  }

  async function patchContact(updates: { responded?: boolean; booked?: boolean }) {
    if (!contact) return
    try {
      await fetch(`/api/provider/contact/${contact.contact_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    } catch {}
  }

  async function handleResponded(responded: boolean) {
    if (!contact) return
    await patchContact({ responded })
    if (responded) {
      setStep('booked')
    } else {
      // No response — record and close
      await patchContact({ responded: false, booked: false })
      removeFromStorage(contact.contact_id)
      setStep('thankyou')
      setTimeout(() => setVisible(false), 2000)
    }
  }

  async function handleBooked(booked: boolean) {
    if (!contact) return
    await patchContact({ booked })
    removeFromStorage(contact.contact_id)
    setStep('thankyou')
    setTimeout(() => setVisible(false), 2000)
  }

  function handleRemindLater() {
    if (!contact) return
    markPromptSent(contact.contact_id)
    setVisible(false)
  }

  if (!visible || !contact) return null

  const providerName = contact.provider_name || 'the provider'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleRemindLater}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-response-slide-up"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-6 pt-4 pb-2">
          {step === 'responded' && (
            <>
              <p className="text-xs font-semibold text-center uppercase tracking-widest text-slate-400 mb-3">
                Quick feedback
              </p>
              <h2 className="text-lg font-bold text-slate-900 text-center mb-6 leading-snug">
                Did <span className="text-[var(--pl-teal)]">{providerName}</span> get back to you on WhatsApp?
              </h2>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => handleResponded(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all"
                >
                  <span className="text-lg">👍</span> Yes, they replied
                </button>
                <button
                  onClick={() => handleResponded(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm border-2 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95 transition-all"
                >
                  <span className="text-lg">👎</span> No response
                </button>
              </div>

              <button
                onClick={handleRemindLater}
                className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-2"
              >
                Remind me later
              </button>
            </>
          )}

          {step === 'booked' && (
            <>
              <p className="text-xs font-semibold text-center uppercase tracking-widest text-slate-400 mb-3">
                Great to hear!
              </p>
              <h2 className="text-lg font-bold text-slate-900 text-center mb-6 leading-snug">
                Did you book a session with {providerName}?
              </h2>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => handleBooked(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all"
                >
                  <span className="text-lg">✅</span> Yes, booked!
                </button>
                <button
                  onClick={() => handleBooked(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm border-2 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
                >
                  <span className="text-lg">❌</span> Not yet
                </button>
              </div>
            </>
          )}

          {step === 'thankyou' && (
            <div className="py-6 text-center">
              <p className="text-4xl mb-3">🙏</p>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Thanks for the feedback!</h2>
              <p className="text-sm text-slate-500">
                This helps us rank the most responsive providers higher.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes response-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-response-slide-up {
          animation: response-slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </>
  )
}
