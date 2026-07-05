'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ParentBottomNav from '@/components/ParentBottomNav'
import { LoadingButton } from '@/components/LoadingButton'
import { useRazorpayCheckout } from '@/lib/useRazorpayCheckout'

interface Props {
  currentPlan: 'monthly' | null
  expiresAt: string | null
  isLoggedIn: boolean
  trialStatus?: 'no_trial' | 'trial' | 'lapsed' | 'active'
  trialDaysRemaining?: number | null
  hasEverPaid?: boolean
  walkerToken?: string | null
  walkerName?: string | null
  walkerPhone?: string | null
  dogName?: string | null
}

const FEATURES = [
  { label: 'GPS-tagged walk reports after every walk' },
  { label: 'Photos and pee/poop count logged per walk' },
  { label: 'WhatsApp delivery after each walk' },
  { label: 'Full report history — browse past walks anytime' },
  { label: 'Multiple walkers per dog' },
  { label: 'Reports saved permanently to your account' },
]

const WHAT_HAPPENS = [
  { locked: true,  text: 'New walk reports are not delivered to you' },
  { locked: true,  text: 'WhatsApp notifications stop arriving' },
  { locked: true,  text: 'You won’t be able to view past reports until you resubscribe' },
  { locked: false, text: 'Your dog’s walk history is safely kept, never deleted' },
  { locked: false, text: 'Your walker keeps logging walks as normal' },
  { locked: false, text: 'You can upgrade anytime to resume delivery' },
]

const FAQ = [
  {
    q: 'What happens when my trial ends?',
    a: 'Your walker keeps logging walks as usual, but new reports will not be delivered to your WhatsApp or account until you upgrade. Your dog’s history from your trial is never deleted — resubscribe anytime to view it again.',
  },
  {
    q: 'How does PupStep actually work?',
    a: 'PupStep gives your walker a dashboard link — no app download. They tap Start Walk, mark pee and poop spots on a live GPS map, take a photo, and end the walk. A report is generated automatically and sent to you on WhatsApp.',
  },
  {
    q: 'Will my walker see any difference?',
    a: 'No. Walkers use PupStep for free, always. The dashboard link works the same. Only you lose report delivery when your trial ends.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — cancel before your next billing date and you will not be charged again. Your reports remain visible until your current paid period ends.',
  },
]

// 4-layer claymorphism shadow — cream cards
const CLAY_SHADOW_CREAM = [
  'inset 0 2px 0 rgba(255,255,255,0.95)',
  'inset 0 -3px 0 rgba(0,0,0,0.10)',
  '0 1px 0 rgba(0,0,0,0.06)',
  '0 8px 24px -4px rgba(10,47,53,0.14)',
  '0 32px 64px -12px rgba(10,47,53,0.10)',
].join(', ')

// 4-layer claymorphism shadow — teal cards
const CLAY_SHADOW_TEAL = [
  'inset 0 2px 0 rgba(255,255,255,0.18)',
  'inset 0 -4px 0 rgba(0,0,0,0.28)',
  '0 1px 0 rgba(0,0,0,0.12)',
  '0 12px 32px -4px rgba(10,47,53,0.40)',
  '0 40px 80px -16px rgba(10,47,53,0.30)',
].join(', ')

// Orange CTA shadow
const CLAY_SHADOW_ORANGE = [
  'inset 0 2px 0 rgba(255,200,120,0.60)',
  'inset 0 -3px 0 rgba(180,60,0,0.25)',
  '0 4px 14px rgba(255,140,82,0.45)',
  '0 12px 28px rgba(255,140,82,0.20)',
].join(', ')

export default function UpgradeClient({ currentPlan, expiresAt, isLoggedIn, trialStatus = 'no_trial', trialDaysRemaining, hasEverPaid = false, walkerToken, walkerName, walkerPhone, dogName }: Props) {
  const [success, setSuccess] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const { checkout: handleCheckout, loading, error } = useRazorpayCheckout()

  // — Success state —
  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: '#FFFBEB' }}>
        <div
          className="text-center max-w-sm w-full px-8 py-10 rounded-[28px]"
          style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}
        >
          <div className="text-6xl mb-5">🎉</div>
          <h1
            className="text-3xl font-bold mb-3"
            style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}
          >
            You&apos;re all set!
          </h1>
          <p className="mb-8 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35', opacity: 0.72 }}>
            Welcome to PupStep Pro. Your dog&apos;s care history is now always at your fingertips.
          </p>
          <Link
            href="/my-account"
            className="inline-block px-8 py-3.5 rounded-full font-bold text-white text-sm"
            style={{ background: '#FF8C52', boxShadow: CLAY_SHADOW_ORANGE, fontFamily: 'var(--font-nunito)' }}
          >
            Go to My Account
          </Link>
        </div>
      </div>
    )
  }

  // — Already subscribed state —
  if (currentPlan) {
    const expiry = expiresAt
      ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null
    return (
      <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: '#FFFBEB' }}>
        <div
          className="text-center max-w-sm w-full px-8 py-10 rounded-[28px]"
          style={{ background: '#0A2F35', boxShadow: CLAY_SHADOW_TEAL }}
        >
          <div className="text-5xl mb-5">🐾</div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-fredoka)', color: '#FFFBEB' }}
          >
            You&apos;re on the Monthly plan
          </h1>
          {expiry && (
            <p className="mb-6 text-sm" style={{ fontFamily: 'var(--font-nunito)', color: '#FFFBEB', opacity: 0.65 }}>
              Active until {expiry}
            </p>
          )}
          <Link
            href="/my-account"
            className="inline-block px-8 py-3.5 rounded-full font-bold text-white text-sm"
            style={{ background: '#FF8C52', boxShadow: CLAY_SHADOW_ORANGE, fontFamily: 'var(--font-nunito)' }}
          >
            Back to My Account
          </Link>
        </div>
      </div>
    )
  }

  // — Main pricing view —
  return (
    <div
      className="min-h-dvh"
      style={{ background: 'linear-gradient(180deg, #FFFBEB 0%, #FFF3C4 100%)' }}
    >
      {/* Sticky app header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: 'rgba(255,251,235,0.95)', borderBottom: '1px solid oklch(0.906 0.06 88)', backdropFilter: 'blur(8px)' }}
      >
        <Link href={isLoggedIn ? '/home' : '/'} className="flex items-center">
          <Image src="/logo.webp" alt="PupStep" width={120} height={44} className="h-9 w-auto" priority />
        </Link>
        <Link
          href={isLoggedIn ? '/my-account' : '/login'}
          className="text-xs font-bold px-4 py-2 rounded-full"
          style={{ background: isLoggedIn ? 'oklch(0.48 0.17 196 / 0.1)' : '#FF8C52', color: isLoggedIn ? 'oklch(0.48 0.17 196)' : '#fff', fontFamily: 'var(--font-nunito)' }}
        >
          {isLoggedIn ? 'My account' : 'Sign in'}
        </Link>
      </header>

      <div className="max-w-lg mx-auto px-4 py-10 pb-32">

        {/* Header */}
        <div className="text-center mb-12">
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
            style={{ background: 'rgba(255,140,82,0.15)', color: '#E07030', fontFamily: 'var(--font-nunito)' }}
          >
            PupStep Pro
          </span>
          <h1
            className="text-4xl md:text-5xl font-bold leading-tight mb-4"
            style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}
          >
            {trialStatus === 'no_trial' && 'Your 3-day free trial is waiting'}
            {trialStatus === 'trial' && 'Keep receiving reports after your trial'}
            {trialStatus === 'lapsed' && 'Welcome back!'}
            {trialStatus === 'active' && 'You\'re on PupStep Pro'}
          </h1>
          <p
            className="text-base max-w-sm mx-auto leading-relaxed"
            style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35', opacity: 0.65 }}
          >
            Your walker logs every walk for free. Your subscription unlocks GPS report delivery to your WhatsApp — automatically, every time.
          </p>
          <p
            className="text-sm max-w-sm mx-auto leading-relaxed mt-3"
            style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35', opacity: 0.5 }}
          >
            Every walk logged becomes a permanent part of {dogName ? `${dogName}'s` : 'your dog\'s'} health history — vet visits, grooming, and daily walks, all in one place.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-2xl text-sm font-medium"
            style={{ background: '#FEE2E2', color: '#991B1B', fontFamily: 'var(--font-nunito)', boxShadow: '0 2px 8px rgba(153,27,27,0.12)' }}
          >
            {error}
          </div>
        )}

        {/* Pricing card — state-aware */}
        <div className="mb-10">

          {/* no_trial: trial hasn't started yet */}
          {trialStatus === 'no_trial' && (
            <>
              <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: CLAY_SHADOW_CREAM, marginBottom: 16 }}>
                <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color: '#0A2F35', marginBottom: 8 }}>
                  Your free trial starts with your first walk report.
                </p>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#64748B', lineHeight: 1.65, marginBottom: 20 }}>
                  No payment needed. Once {walkerName ?? 'your walker'} logs {dogName ? `${dogName}'s` : 'a'} first walk, your 3-day trial begins automatically.
                </p>
                {walkerToken ? (
                  <a
                    href={(() => {
                      const text = encodeURIComponent(`Hi${walkerName ? ` ${walkerName}` : ''}, please log today's walk on PupStep and send me the report. Here's your dashboard: https://pupstep.in/walker/${walkerToken}`)
                      const digits = walkerPhone?.replace(/\D/g, '') ?? ''
                      return digits ? `https://wa.me/91${digits}?text=${text}` : `https://wa.me/?text=${text}`
                    })()}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 16, background: '#25D366', color: '#fff', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' }}
                  >
                    Send dashboard link to {walkerName ?? 'walker'} on WhatsApp
                  </a>
                ) : (
                  <>
                    <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: 'oklch(0.48 0.17 196)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Step 1 — required before your trial can start
                    </p>
                    <Link href="/setup/qr"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 16, background: 'oklch(0.48 0.17 196)', color: '#fff', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' }}
                    >
                      Connect your walker first →
                    </Link>
                  </>
                )}
              </div>

              {/* Pro features info — no payment button in no_trial state */}
              <div
                className="rounded-[28px] p-7"
                style={{ background: '#0A2F35', boxShadow: CLAY_SHADOW_TEAL }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: 'rgba(255,251,235,0.45)', fontFamily: 'var(--font-nunito)' }}
                    >
                      Monthly plan
                    </p>
                    <div className="flex items-end gap-2">
                      <span
                        className="text-5xl font-bold leading-none"
                        style={{ fontFamily: 'var(--font-fredoka)', color: '#FFFBEB' }}
                      >
                        ₹199
                      </span>
                      <span className="text-sm pb-1" style={{ color: 'rgba(255,251,235,0.5)', fontFamily: 'var(--font-nunito)' }}>/month</span>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'rgba(255,140,82,0.9)', fontFamily: 'var(--font-nunito)' }}>
                      Cancel anytime
                    </p>
                  </div>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: 'rgba(255,251,235,0.08)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.20)' }}
                  >
                    🐾
                  </div>
                </div>
                <ul className="space-y-2.5 mb-5">
                  {FEATURES.map((f) => (
                    <li
                      key={f.label}
                      className="flex items-center gap-2.5 text-sm"
                      style={{ color: '#FFFBEB', fontFamily: 'var(--font-nunito)', opacity: 0.9 }}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                        style={{ background: 'rgba(255,140,82,0.20)' }}
                      >
                        ✓
                      </span>
                      {f.label}
                    </li>
                  ))}
                </ul>
                <p className="text-xs" style={{ color: 'rgba(255,251,235,0.50)', fontFamily: 'var(--font-nunito)', lineHeight: 1.6 }}>
                  After your 3-day trial, upgrade for ₹199/month to keep receiving reports.
                </p>
              </div>
            </>
          )}

          {/* trial: active trial — show countdown + payment button */}
          {trialStatus === 'trial' && (
            <div
              className="rounded-[28px] p-7"
              style={{ background: '#0A2F35', boxShadow: CLAY_SHADOW_TEAL }}
            >
              {trialDaysRemaining != null && (
                <div
                  className="mb-5 px-4 py-3 rounded-2xl text-sm font-semibold text-center"
                  style={{ background: 'rgba(255,140,82,0.15)', color: 'rgba(255,140,82,0.95)', fontFamily: 'var(--font-nunito)' }}
                >
                  {trialDaysRemaining === 1 ? 'Last day of your free trial' : `You have ${trialDaysRemaining} days left in your trial`}
                </div>
              )}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: 'rgba(255,251,235,0.45)', fontFamily: 'var(--font-nunito)' }}
                  >
                    Monthly plan
                  </p>
                  <div className="flex items-end gap-2">
                    <span
                      className="text-5xl font-bold leading-none"
                      style={{ fontFamily: 'var(--font-fredoka)', color: '#FFFBEB' }}
                    >
                      ₹199
                    </span>
                    <span className="text-sm pb-1" style={{ color: 'rgba(255,251,235,0.5)', fontFamily: 'var(--font-nunito)' }}>/month</span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(255,140,82,0.9)', fontFamily: 'var(--font-nunito)' }}>
                    Cancel anytime
                  </p>
                </div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: 'rgba(255,251,235,0.08)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.20)' }}
                >
                  🐾
                </div>
              </div>
              <ul className="space-y-2.5 mb-6">
                {FEATURES.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-center gap-2.5 text-sm"
                    style={{ color: '#FFFBEB', fontFamily: 'var(--font-nunito)', opacity: 0.9 }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ background: 'rgba(255,140,82,0.20)' }}
                    >
                      ✓
                    </span>
                    {f.label}
                  </li>
                ))}
              </ul>
              {isLoggedIn ? (
                <LoadingButton
                  onClick={() => handleCheckout('monthly')}
                  loading={loading === 'monthly'}
                  disabled={loading !== null}
                  loadingText="Processing…"
                  className="rounded-[18px] text-sm"
                  style={{ padding: '16px', background: '#FF8C52', boxShadow: CLAY_SHADOW_ORANGE }}
                >
                  {hasEverPaid ? 'Upgrade to Pro — ₹199/month' : 'Pay Now — ₹199/month'}
                </LoadingButton>
              ) : (
                <Link
                  href="/login?next=/upgrade"
                  className="w-full py-4 rounded-[18px] font-bold text-white text-sm flex items-center justify-center"
                  style={{ background: '#FF8C52', boxShadow: CLAY_SHADOW_ORANGE, fontFamily: 'var(--font-nunito)' }}
                >
                  {hasEverPaid ? 'Sign in to upgrade' : 'Sign in to pay'}
                </Link>
              )}
            </div>
          )}

          {/* lapsed: had access before (trial ran out OR subscription
              cancelled/expired) — welcome-back treatment, no trial language */}
          {trialStatus === 'lapsed' && (
            <div
              className="rounded-[28px] p-7"
              style={{ background: '#0A2F35', boxShadow: CLAY_SHADOW_TEAL }}
            >
              <div
                className="mb-5 px-4 py-3 rounded-2xl text-sm font-semibold text-center"
                style={{ background: 'rgba(252,165,165,0.12)', color: 'rgba(252,165,165,0.90)', fontFamily: 'var(--font-nunito)' }}
              >
                {expiresAt
                  ? `Your account was active until ${new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} — resume anytime`
                  : 'Your access has paused — resume anytime'}
              </div>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: 'rgba(255,251,235,0.45)', fontFamily: 'var(--font-nunito)' }}
                  >
                    Monthly plan
                  </p>
                  <div className="flex items-end gap-2">
                    <span
                      className="text-5xl font-bold leading-none"
                      style={{ fontFamily: 'var(--font-fredoka)', color: '#FFFBEB' }}
                    >
                      ₹199
                    </span>
                    <span className="text-sm pb-1" style={{ color: 'rgba(255,251,235,0.5)', fontFamily: 'var(--font-nunito)' }}>/month</span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(255,140,82,0.9)', fontFamily: 'var(--font-nunito)' }}>
                    Cancel anytime
                  </p>
                </div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: 'rgba(255,251,235,0.08)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.20)' }}
                >
                  🐾
                </div>
              </div>
              <ul className="space-y-2.5 mb-6">
                {FEATURES.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-center gap-2.5 text-sm"
                    style={{ color: '#FFFBEB', fontFamily: 'var(--font-nunito)', opacity: 0.9 }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ background: 'rgba(255,140,82,0.20)' }}
                    >
                      ✓
                    </span>
                    {f.label}
                  </li>
                ))}
              </ul>
              {isLoggedIn ? (
                <LoadingButton
                  onClick={() => handleCheckout('monthly')}
                  loading={loading === 'monthly'}
                  disabled={loading !== null}
                  loadingText="Processing…"
                  className="rounded-[18px] text-sm"
                  style={{ padding: '16px', background: '#FF8C52', boxShadow: CLAY_SHADOW_ORANGE }}
                >
                  {hasEverPaid ? 'Resubscribe — ₹199/month' : 'Pay Now — ₹199/month'}
                </LoadingButton>
              ) : (
                <Link
                  href="/login?next=/upgrade"
                  className="w-full py-4 rounded-[18px] font-bold text-white text-sm flex items-center justify-center"
                  style={{ background: '#FF8C52', boxShadow: CLAY_SHADOW_ORANGE, fontFamily: 'var(--font-nunito)' }}
                >
                  {hasEverPaid ? 'Sign in to resubscribe' : 'Sign in to pay'}
                </Link>
              )}
            </div>
          )}

        </div>

        {/* What happens after trial */}
        <div
          className="rounded-[24px] p-6 mb-8"
          style={{ background: 'linear-gradient(155deg, #FF8C52, #F56B22)', boxShadow: CLAY_SHADOW_ORANGE }}
        >
          <p className="text-sm font-bold mb-4" style={{ color: '#0A2F35', fontFamily: 'var(--font-nunito)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11 }}>
            {trialStatus === 'lapsed' ? 'While your account is paused' : 'When your 3-day trial ends'}
          </p>
          <div className="space-y-2.5">
            {WHAT_HAPPENS.map(({ locked, text }) => (
              <div key={text} className="flex items-start gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: '#fff', color: locked ? '#7C2D12' : '#0A2F35' }}
                >
                  {locked ? '✕' : '✓'}
                </span>
                <span className="text-sm font-semibold" style={{ color: locked ? '#7C2D12' : '#0A2F35', fontFamily: 'var(--font-nunito)' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4 font-medium" style={{ color: '#0A2F35', fontFamily: 'var(--font-nunito)', lineHeight: 1.6 }}>
            Reports are created when your walker logs the walk. PupStep stores and delivers them. Upgrading restores delivery instantly.
          </p>
        </div>

        {/* Social proof */}
        <p
          className="text-center text-xs mb-10"
          style={{ color: 'rgba(10,47,53,0.45)', fontFamily: 'var(--font-nunito)' }}
        >
          Dog parents in Juhu, Versova &amp; Andheri use PupStep Pro every day
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {['GPS every walk', 'Photos never deleted', 'Vet-ready PDF', 'Grooming history', 'Share with vets'].map((pill) => (
            <span
              key={pill}
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{
                background: '#fff',
                color: '#0A2F35',
                fontFamily: 'var(--font-nunito)',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,1), inset 0 -2px 0 rgba(0,0,0,0.08), 0 4px 12px rgba(10,47,53,0.10)',
              }}
            >
              {pill}
            </span>
          ))}
        </div>

        {/* FAQ accordion */}
        <div className="space-y-2 mb-10">
          <h2
            className="text-lg font-bold mb-4"
            style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}
          >
            Common questions
          </h2>
          {FAQ.map(({ q, a }, i) => (
            <div
              key={q}
              className="rounded-[18px] overflow-hidden"
              style={{ background: '#fff', boxShadow: CLAY_SHADOW_CREAM }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span
                  className="text-sm font-semibold pr-4"
                  style={{ color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}
                >
                  {q}
                </span>
                <span
                  className="text-lg flex-shrink-0 transition-transform duration-200"
                  style={{ transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)', color: '#FF8C52' }}
                >
                  +
                </span>
              </button>
              {openFaq === i && (
                <div
                  className="px-5 pb-4 text-sm leading-relaxed"
                  style={{ color: '#0A2F35', opacity: 0.7, fontFamily: 'var(--font-nunito)' }}
                >
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center space-y-1">
          <p className="text-xs" style={{ color: 'rgba(10,47,53,0.40)', fontFamily: 'var(--font-nunito)' }}>
            Providers are never charged. Pro is only for dog parents.
          </p>
          <p className="text-xs" style={{ color: 'rgba(10,47,53,0.35)', fontFamily: 'var(--font-nunito)' }}>
            <Link href="/refund-policy" className="underline underline-offset-2">Refund policy</Link>
            {' · '}
            <Link href="/privacy-policy" className="underline underline-offset-2">Privacy</Link>
            {' · '}
            <Link href="/terms" className="underline underline-offset-2">Terms</Link>
          </p>
        </div>

      </div>

      {isLoggedIn && <ParentBottomNav />}
    </div>
  )
}
