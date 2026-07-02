'use client'

// NOTE: This page must work in PWA mode (mobile-web-app-capable).
// Ensure layout.tsx includes <meta name="mobile-web-app-capable" content="yes" />
// and <meta name="apple-mobile-web-app-capable" content="yes" />

import { useState, useEffect } from 'react'

type Lang = 'en' | 'hi' | 'mr'
type Step = 'form' | 'success'
type ViewState = 'phone-first' | 'returning' | 'new-walker'

const STRINGS = {
  en: {
    brand: 'PupStep 🐾',
    codeLabel: 'Enter the 4-digit code shown by the owner *',
    nameLabel: 'Your name *',
    phoneLabel: 'Your phone number *',
    emailLabel: 'Your email',
    optional: 'optional',
    roleLabel: 'I am the...',
    submitBtn: 'Connect & Start Logging →',
    roleDogWalker: '🐕 Dog Walker',
    roleFamilyFriend: '👨‍👩‍👧 Family / Friend',
    roleProfessional: '💼 Professional Walker',
    roleOther: '👤 Other',
    phonePlaceholder: '10-digit number',
    dashboardHint: "We'll send your dashboard link here",
  },
  hi: {
    brand: 'PupStep 🐾',
    codeLabel: 'मालिक द्वारा दिखाया गया 4-अंकीय कोड दर्ज करें *',
    nameLabel: 'आपका नाम *',
    phoneLabel: 'आपका फोन नंबर *',
    emailLabel: 'आपका ईमेल',
    optional: 'वैकल्पिक',
    roleLabel: 'मैं हूँ...',
    submitBtn: 'जोड़ें और शुरू करें →',
    roleDogWalker: '🐕 कुत्ता वॉकर',
    roleFamilyFriend: '👨‍👩‍👧 परिवार / मित्र',
    roleProfessional: '💼 पेशेवर वॉकर',
    roleOther: '👤 अन्य',
    phonePlaceholder: '10 अंकों का नंबर',
    dashboardHint: 'हम यहाँ आपका डैशबोर्ड लिंक भेजेंगे',
  },
  mr: {
    brand: 'PupStep 🐾',
    codeLabel: 'मालकाने दाखवलेला 4-अंकी कोड टाका *',
    nameLabel: 'तुमचे नाव *',
    phoneLabel: 'तुमचा फोन नंबर *',
    emailLabel: 'तुमचा ईमेल',
    optional: 'ऐच्छिक',
    roleLabel: 'मी आहे...',
    submitBtn: 'कनेक्ट करा आणि सुरू करा →',
    roleDogWalker: '🐕 कुत्रा वॉकर',
    roleFamilyFriend: '👨‍👩‍👧 कुटुंब / मित्र',
    roleProfessional: '💼 व्यावसायिक वॉकर',
    roleOther: '👤 इतर',
    phonePlaceholder: '10-अंकी नंबर',
    dashboardHint: 'आम्ही येथे तुमचा डॅशबोर्ड लिंक पाठवू',
  },
} as const

interface ConnectClientProps {
  token: string
  dogName: string
  dogBreed: string | null
  dogPhoto: string | null
  healthNotes: string | null
  ownerFirstName: string
  isClaimed: boolean
  expectedWalkerPhone: string | null
}

export default function ConnectClient({
  token,
  dogName,
  dogPhoto,
  healthNotes,
  ownerFirstName,
  dogBreed,
  expectedWalkerPhone,
}: ConnectClientProps) {
  const [lang, setLang] = useState<Lang>('en')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('form')
  const [walkerDashWaUrl, setWalkerDashWaUrl] = useState('')
  const [walkerDashUrl, setWalkerDashUrl] = useState('')

  // Phone-first state machine
  const [viewState, setViewState] = useState<ViewState>('phone-first')
  const [phoneInput, setPhoneInput] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [recognisedName, setRecognisedName] = useState<string | null>(null)
  const [recognisedRole, setRecognisedRole] = useState<string | null>(null)

  useEffect(() => {
    const dashUrl = `${window.location.origin}/walker/${token}`
    setWalkerDashUrl(dashUrl)
    const msg = `My PupStep dashboard for ${dogName} 🐾\nTap to start logging walks:\n${dashUrl}`
    setWalkerDashWaUrl('https://wa.me/?text=' + encodeURIComponent(msg))
  }, [token, dogName])

  // If parent pre-set the walker's phone, auto-lookup on mount
  useEffect(() => {
    if (expectedWalkerPhone) {
      const digits = expectedWalkerPhone.replace(/\D/g, '')
      setPhoneInput(digits)
      lookupPhone(digits)
    }
  }, [expectedWalkerPhone]) // eslint-disable-line

  const t = STRINGS[lang]

  const ROLE_OPTIONS = [
    { value: 'dog_walker', label: t.roleDogWalker },
    { value: 'family_friend', label: t.roleFamilyFriend },
    { value: 'professional', label: t.roleProfessional },
    { value: 'other', label: t.roleOther },
  ]

  async function lookupPhone(digits: string) {
    if (digits.length !== 10) return
    setLookingUp(true)
    try {
      const res = await fetch(`/api/walker/lookup?phone=${digits}&token=${encodeURIComponent(token)}`)
      const data = await res.json()
      if (data.found) {
        setRecognisedName(data.name as string)
        setRecognisedRole(data.role as string | null)
        setViewState('returning')
      } else {
        setViewState('new-walker'); setPhone(digits)
      }
    } catch {
      setViewState('new-walker')
    } finally {
      setLookingUp(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!otp || otp.length !== 4) {
      setError('Please enter the 4-digit code.')
      return
    }

    // For new-walker view, validate name + phone
    if (viewState === 'new-walker') {
      if (!name.trim()) {
        setError('Please enter your name.')
        return
      }
      const digitsOnly = phone.replace(/\D/g, '')
      if (digitsOnly.length !== 10) {
        setError('Please enter a valid 10-digit phone number.')
        return
      }
    }

    setLoading(true)
    setError(null)

    const submittedPhone =
      viewState === 'returning'
        ? phoneInput
        : phone.trim() || phoneInput || null

    try {
      const res = await fetch(`/api/connect/${token}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walker_name: viewState === 'returning' ? recognisedName : name.trim(),
          walker_phone: submittedPhone || null,
          walker_email: email.trim() || null,
          walker_role:
            viewState === 'returning' ? (recognisedRole ?? null) : (role || null),
          otp,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409 || data.error === 'Already claimed') {
          setError('This QR is already linked to a walker. Ask the owner for a new QR code.')
        } else {
          setError(data.error ?? 'Something went wrong. Please try again.')
        }
        setLoading(false)
        return
      }

      setStep('success')
      setLoading(false)
      // Auto-open WhatsApp so walker saves their dashboard link immediately
      if (walkerDashWaUrl) {
        setTimeout(() => window.open(walkerDashWaUrl, '_blank', 'noopener'), 600)
      }
      return
    } catch {
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#FFFBEB' }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: '#DCFCE7', border: '3px solid #86EFAC' }}>
          <span className="text-5xl">🐾</span>
        </div>

        <h1
          className="text-3xl font-bold text-[#0A2F35] mb-2"
          style={{ fontFamily: 'var(--font-fredoka)' }}
        >
          You&apos;re connected to {dogName}!
        </h1>

        <p className="text-slate-500 text-sm mb-8 leading-relaxed px-2" style={{ fontFamily: 'var(--font-nunito)' }}>
          Your walk dashboard is ready.<br />
          <strong>{ownerFirstName}</strong> will send you your dashboard link on WhatsApp.<br />
          Once you receive it, tap it to start logging walks.
        </p>

        <div className="w-full max-w-sm space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide" style={{ fontFamily: 'var(--font-nunito)' }}>
            OR save it yourself now:
          </p>

          {/* WhatsApp save button */}
          <a
            href={walkerDashWaUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-base shadow-md"
            style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', fontSize: '17px', textDecoration: 'none' }}
          >
            📲 Save my dashboard link on WhatsApp
          </a>

          {/* Open dashboard button */}
          <button
            type="button"
            onClick={() => window.location.replace(walkerDashUrl || `/walker/${token}`)}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-base shadow-md"
            style={{ background: 'oklch(0.48 0.17 196)', fontFamily: 'var(--font-fredoka)', fontSize: '17px' }}
          >
            → Open my dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Dog context header (shared across views) ─────────────────────────────
  const DogHeader = () => (
    <>
      {/* Language toggle */}
      <div className="flex items-center justify-center pt-4 px-6 gap-2">
        {(['en', 'hi', 'mr'] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: lang === l ? 'oklch(0.48 0.17 196)' : 'rgba(0,0,0,0.06)',
              color: lang === l ? '#ffffff' : '#4B5563',
              fontFamily: 'var(--font-nunito)',
            }}
          >
            {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'मराठी'}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-center pt-6 pb-4 px-6">
        <span className="text-2xl font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
          {t.brand}
        </span>
      </div>

      {/* Dog avatar section */}
      <div className="flex flex-col items-center px-6 pb-6">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center mb-4 shadow-lg"
          style={{ background: '#FF8C52' }}
        >
          {dogPhoto ? (
            <img src={dogPhoto} alt={dogName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-5xl">🐕</span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-[#0A2F35] text-center" style={{ fontFamily: 'var(--font-fredoka)' }}>
          {dogName}
        </h1>
        {dogBreed && <p className="text-slate-400 text-sm mt-1">{dogBreed}</p>}
        <p className="text-slate-600 text-base text-center mt-2 leading-relaxed px-4" style={{ fontFamily: 'var(--font-nunito)' }}>
          <strong>{ownerFirstName}</strong> shared this code with you to track{' '}
          <strong>{dogName}</strong>&apos;s walks 🐾
        </p>
      </div>

      {/* Health notes warning */}
      {healthNotes && (
        <div className="mx-5 mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 flex gap-3 items-start">
          <span className="text-xl flex-shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-800">Health notes</p>
            <p className="text-sm text-amber-700 mt-0.5">{healthNotes}</p>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-500 px-8 mb-6" style={{ fontFamily: 'var(--font-nunito)' }}>
        Every walk you take will be automatically reported to the owner.
      </p>
    </>
  )

  // ── VIEW: phone-first ─────────────────────────────────────────────────────
  if (viewState === 'phone-first') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#FFFBEB' }}>
        {DogHeader()}

        <div style={{ padding: '0 20px 40px' }}>
          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#0A2F35', marginBottom: 6 }}>
            What&apos;s your mobile number?
          </p>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', marginBottom: 20 }}>
            We&apos;ll check if you&apos;ve used PupStep before
          </p>

          <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: '#fff' }}>
            <span style={{ padding: '13px 10px 13px 14px', fontSize: 15, color: '#6B7280', fontWeight: 700, fontFamily: 'var(--font-nunito)', userSelect: 'none' }}>+91</span>
            <input
              type="tel"
              inputMode="numeric"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
              onKeyDown={e => { if (e.key === 'Enter' && phoneInput.length === 10) lookupPhone(phoneInput) }}
              placeholder="9876543210"
              autoFocus
              style={{ flex: 1, padding: '13px 14px 13px 0', border: 'none', outline: 'none', fontSize: 15, fontFamily: 'var(--font-nunito)', color: '#0A2F35', background: 'transparent' }}
            />
          </div>

          <button
            disabled={phoneInput.length !== 10 || lookingUp}
            onClick={() => lookupPhone(phoneInput)}
            style={{
              width: '100%',
              minHeight: 56,
              borderRadius: 14,
              border: 'none',
              background: phoneInput.length === 10 ? '#FF8C52' : '#E5E7EB',
              color: phoneInput.length === 10 ? '#fff' : '#9CA3AF',
              fontFamily: 'var(--font-fredoka)',
              fontSize: 17,
              fontWeight: 700,
              cursor: phoneInput.length === 10 ? 'pointer' : 'not-allowed',
            }}
          >
            {lookingUp ? 'Checking…' : 'Continue →'}
          </button>
        </div>
      </div>
    )
  }

  // ── VIEW: returning walker — OTP only ────────────────────────────────────
  if (viewState === 'returning') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#FFFBEB' }}>
        {DogHeader()}

        <form onSubmit={handleSubmit} style={{ padding: '0 20px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'oklch(0.94 0.06 196)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, margin: '0 auto 12px',
            }}>
              👋
            </div>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color: '#0A2F35', margin: '0 0 6px' }}>
              Welcome back, {recognisedName}!
            </h2>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: 0 }}>
              Look at your client&apos;s screen and enter the 4-digit code shown below their QR.
            </p>
          </div>

          {/* OTP field */}
          <label style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: '#0A2F35', marginBottom: 8 }}>
            4-digit code
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1 2 3 4"
            autoFocus
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 12,
              border: '2px solid #E5E7EB',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.3em',
              textAlign: 'center',
              fontFamily: 'monospace',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 8,
            }}
          />
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9CA3AF', marginBottom: 20, textAlign: 'center' }}>
            The code is shown on your client&apos;s phone screen
          </p>

          {error && (
            <p style={{ color: '#DC2626', fontSize: 13, fontFamily: 'var(--font-nunito)', marginBottom: 12, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 4}
            style={{
              width: '100%',
              minHeight: 56,
              borderRadius: 14,
              border: 'none',
              background: otp.length === 4 ? 'oklch(0.48 0.17 196)' : '#E5E7EB',
              color: otp.length === 4 ? '#fff' : '#9CA3AF',
              fontFamily: 'var(--font-fredoka)',
              fontSize: 17,
              fontWeight: 700,
              cursor: otp.length === 4 ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Connecting…' : 'Connect →'}
          </button>

          <button
            type="button"
            onClick={() => { setViewState('phone-first'); setOtp(''); setError(null) }}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              marginTop: 12,
              fontFamily: 'var(--font-nunito)',
              fontSize: 13,
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '8px',
              minHeight: 44,
            }}
          >
            ← Use a different number
          </button>
        </form>
      </div>
    )
  }

  // ── VIEW: new-walker — full form ─────────────────────────────────────────
  // (viewState === 'new-walker')
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFBEB' }}>
      {DogHeader()}

      {/* Step progress indicator */}
      <div className="flex items-center justify-center mb-5" style={{ fontFamily: 'var(--font-nunito)' }}>
        <div className="flex items-center gap-0" style={{ maxWidth: 200 }}>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
            style={{ background: '#FF8C52', whiteSpace: 'nowrap' }}
          >
            <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[10px] font-bold" style={{ color: '#FF8C52' }}>1</span>
            Enter code
          </div>
          <div className="h-0.5 w-6 flex-shrink-0" style={{ background: '#D1D5DB' }} />
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2"
            style={{ border: '2px solid #D1D5DB', color: '#9CA3AF', whiteSpace: 'nowrap', background: 'transparent' }}
          >
            <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-400">2</span>
            Get dashboard
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 px-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#0A2F35] mb-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t.codeLabel}
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]{4}"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="e.g. 8022"
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-3xl text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF8C52] min-h-[64px] text-center tracking-widest"
            style={{ fontFamily: 'var(--font-fredoka)' }}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[#0A2F35] mb-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t.nameLabel}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Raju"
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C52] min-h-[52px]"
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
        </div>

        {/* Phone — pre-filled from phone-first step, read-only with change link */}
        <div>
          <label className="block text-sm font-bold text-[#0A2F35] mb-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t.phoneLabel}
          </label>
          {phoneInput ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-800 min-h-[52px] flex items-center" style={{ fontFamily: 'var(--font-nunito)' }}>
                +91 {phoneInput}
              </div>
              <button
                type="button"
                onClick={() => { setViewState('phone-first'); setError(null) }}
                className="text-sm text-slate-400 hover:text-slate-600 px-2 py-1 rounded"
                style={{ fontFamily: 'var(--font-nunito)', whiteSpace: 'nowrap' }}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="tel"
                required
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder={t.phonePlaceholder}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C52] min-h-[52px]"
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
              <p className="text-xs text-slate-400 mt-1 ml-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                {t.dashboardHint}
              </p>
            </>
          )}
        </div>

        {/* Email — optional */}
        <div>
          <label className="block text-sm font-bold text-[#0A2F35] mb-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t.emailLabel}{' '}
            <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({t.optional})</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C52] min-h-[52px]"
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
          <p className="text-xs text-slate-400 mt-1 ml-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            {"We'll email your dashboard link so you can always find it"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t.roleLabel}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={`py-3.5 px-3 rounded-2xl text-sm font-semibold border-2 transition-all min-h-[52px] text-left
                  ${role === opt.value
                    ? 'border-[#FF8C52] bg-orange-50 text-[#0A2F35]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <p className="text-center text-xs text-amber-500 font-semibold px-4" style={{ fontFamily: 'var(--font-nunito)' }}>
          After connecting, you&apos;ll get a WhatsApp link to your provider dashboard →
        </p>

        <div className="pb-8 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all disabled:opacity-60 min-h-[56px] shadow-md active:scale-[0.98]"
            style={{
              background: loading ? '#F07030' : '#FF8C52',
              fontFamily: 'var(--font-fredoka)',
            }}
          >
            {loading ? 'Connecting…' : t.submitBtn}
          </button>
        </div>
      </form>
    </div>
  )
}
