'use client'

// NOTE: This page must work in PWA mode (mobile-web-app-capable).
// Ensure layout.tsx includes <meta name="mobile-web-app-capable" content="yes" />
// and <meta name="apple-mobile-web-app-capable" content="yes" />

import { useState, useEffect } from 'react'

type Lang = 'en' | 'hi' | 'mr'
type Step = 'form' | 'success'

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
}

export default function ConnectClient({
  token,
  dogName,
  dogPhoto,
  healthNotes,
  ownerFirstName,
  dogBreed,
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

  useEffect(() => {
    const dashUrl = `${window.location.origin}/walker/${token}`
    setWalkerDashUrl(dashUrl)
    const msg = `My PupStep dashboard for ${dogName} 🐾\nTap to start logging walks:\n${dashUrl}`
    setWalkerDashWaUrl('https://wa.me/?text=' + encodeURIComponent(msg))
  }, [token, dogName])

  const t = STRINGS[lang]

  const ROLE_OPTIONS = [
    { value: 'dog_walker', label: t.roleDogWalker },
    { value: 'family_friend', label: t.roleFamilyFriend },
    { value: 'professional', label: t.roleProfessional },
    { value: 'other', label: t.roleOther },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!otp || otp.length !== 4) {
      setError('Please enter the 4-digit code.')
      return
    }
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length !== 10) {
      setError('Please enter a valid 10-digit phone number.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/connect/${token}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walker_name: name.trim(),
          walker_phone: phone.trim() || null,
          walker_email: email.trim() || null,
          walker_role: role || null,
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
      // They just tap Send — no hunting for a button later
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFBEB' }}>
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

        <div>
          <label className="block text-sm font-bold text-[#0A2F35] mb-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t.phoneLabel}
          </label>
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
