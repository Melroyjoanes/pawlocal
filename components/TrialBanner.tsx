'use client'

import { useState } from 'react'

interface Props {
  status: 'trial' | 'active' | 'expired' | 'no_trial'
  trialDaysRemaining: number | null
  expiresAt: string | null
}

export default function TrialBanner({ status, trialDaysRemaining }: Props) {
  const storageKey = `pupstep_trial_banner_${status}`
  const [dismissed, setDismissed] = useState(() => {
    if (status === 'expired') return false
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })

  if (status === 'active' || status === 'no_trial') return null
  if (dismissed) return null

  function dismiss() {
    try {
      localStorage.setItem(storageKey, '1')
    } catch { /**/ }
    setDismissed(true)
  }

  if (status === 'expired') {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
        style={{
          background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
          border: '1.5px solid #FECDD3',
        }}
      >
        <span className="text-lg flex-shrink-0">🔒</span>
        <p className="flex-1 text-sm font-semibold text-rose-700 leading-snug">
          Your free trial has ended. Subscribe to view new reports.
        </p>
        <a
          href="/upgrade"
          className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full"
          style={{
            background: 'linear-gradient(160deg, #FF8C52 0%, #F07030 100%)',
            color: '#fff',
            boxShadow: '0 3px 0 rgba(175,65,10,0.25)',
          }}
        >
          Subscribe
        </a>
      </div>
    )
  }

  const urgent = (trialDaysRemaining ?? 0) <= 2

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
      style={{
        background: urgent
          ? 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)'
          : 'linear-gradient(135deg, #FFFBEB 0%, #FEF9C3 100%)',
        border: urgent ? '1.5px solid #FED7AA' : '1.5px solid #FDE68A',
      }}
    >
      <span className="text-lg flex-shrink-0">{urgent ? '⏰' : '🐾'}</span>
      <p className="flex-1 text-sm font-semibold leading-snug" style={{ color: '#92400E' }}>
        {urgent
          ? `Only ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left! Subscribe now to keep access.`
          : `${trialDaysRemaining} days left in your free trial`}
      </p>
      {urgent ? (
        <a
          href="/upgrade"
          className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full"
          style={{
            background: 'linear-gradient(160deg, #FF8C52 0%, #F07030 100%)',
            color: '#fff',
            boxShadow: '0 3px 0 rgba(175,65,10,0.25)',
          }}
        >
          Subscribe
        </a>
      ) : (
        <a
          href="/upgrade"
          className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(146,64,14,0.10)',
            color: '#92400E',
          }}
        >
          Upgrade →
        </a>
      )}
      <button
        onClick={dismiss}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors"
        style={{ color: '#92400E', background: 'rgba(146,64,14,0.08)' }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
