'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ConnectClientProps {
  token: string
  dogName: string
  dogBreed: string | null
  dogPhoto: string | null
  healthNotes: string | null
  ownerFirstName: string
  isClaimed: boolean
}

const ROLE_OPTIONS = [
  { value: 'dog_walker', label: '🐕 Dog Walker' },
  { value: 'family_friend', label: '👨‍👩‍👧 Family / Friend' },
  { value: 'professional', label: '💼 Professional Walker' },
  { value: 'other', label: '👤 Other' },
]

export default function ConnectClient({
  token,
  dogName,
  dogPhoto,
  healthNotes,
  ownerFirstName,
}: ConnectClientProps) {
  const router = useRouter()
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

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

      setConnected(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const walkerDashUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/walker/${token}`
    : `https://pupstep.in/walker/${token}`

  if (connected) {
    const waLink = `https://wa.me/91${phone}?text=${encodeURIComponent(`Hi! Your PupStep walk log for ${dogName} is ready 🐾\n\nBookmark this link to log every walk:\n${walkerDashUrl}`)}`
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#FFFBEB' }}>
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-3xl font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
          You're connected, {name}!
        </h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed px-2" style={{ fontFamily: 'var(--font-nunito)' }}>
          You can now log walks for <strong>{dogName}</strong>. Save your walk log link so you can return anytime.
        </p>
        <div className="w-full max-w-sm space-y-3">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)' }}
          >
            📲 Send my walk log link on WhatsApp
          </a>
          <button
            onClick={() => router.push(`/walker/${token}`)}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white"
            style={{ background: '#FF8C52', fontFamily: 'var(--font-fredoka)' }}
          >
            Start Walking →
          </button>
          <p className="text-xs text-slate-400 pt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            💡 Send yourself the WhatsApp link first — then you can return without scanning the QR again
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFBEB' }}>
      {/* Header */}
      <div className="flex items-center justify-center pt-8 pb-4 px-6">
        <span
          className="text-2xl font-bold text-[#0A2F35]"
          style={{ fontFamily: 'var(--font-fredoka)' }}
        >
          PupStep 🐾
        </span>
      </div>

      {/* Step progress indicator */}
      <div className="flex items-center justify-center mb-5" style={{ fontFamily: 'var(--font-nunito)' }}>
        <div className="flex items-center gap-0" style={{ maxWidth: 200 }}>
          {/* Step 1 — active */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
            style={{ background: '#FF8C52', whiteSpace: 'nowrap' }}
          >
            <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[10px] font-bold" style={{ color: '#FF8C52' }}>1</span>
            Enter code
          </div>
          {/* Connector line */}
          <div className="h-0.5 w-6 flex-shrink-0" style={{ background: '#D1D5DB' }} />
          {/* Step 2 — upcoming */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2"
            style={{ border: '2px solid #D1D5DB', color: '#9CA3AF', whiteSpace: 'nowrap', background: 'transparent' }}
          >
            <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-400">2</span>
            Start walking
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
            <img
              src={dogPhoto}
              alt={dogName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-5xl">🐕</span>
          )}
        </div>
        <h1
          className="text-3xl font-bold text-[#0A2F35] text-center"
          style={{ fontFamily: 'var(--font-fredoka)' }}
        >
          {dogName}
        </h1>
        <p className="text-slate-600 text-base text-center mt-2 leading-relaxed px-4"
          style={{ fontFamily: 'var(--font-nunito)' }}>
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

      {/* Info text */}
      <p className="text-center text-xs text-slate-500 px-8 mb-6"
        style={{ fontFamily: 'var(--font-nunito)' }}>
        Every walk you take will be automatically reported to the owner.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 px-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#0A2F35] mb-1.5"
            style={{ fontFamily: 'var(--font-nunito)' }}>
            Enter the 4-digit code shown by the owner *
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
          <label className="block text-sm font-bold text-[#0A2F35] mb-1.5"
            style={{ fontFamily: 'var(--font-nunito)' }}>
            Your name *
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
          <label className="block text-sm font-bold text-[#0A2F35] mb-1.5"
            style={{ fontFamily: 'var(--font-nunito)' }}>
            Your phone number *
          </label>
          <input
            type="tel"
            required
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit number"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C52] min-h-[52px]"
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
          <p className="text-xs text-slate-400 mt-1 ml-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            We'll send your walk log link here
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-[#0A2F35] mb-2"
            style={{ fontFamily: 'var(--font-nunito)' }}>
            I am the...
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

        {/* What happens next note */}
        <p className="text-center text-xs text-amber-500 font-semibold px-4"
          style={{ fontFamily: 'var(--font-nunito)' }}>
          After connecting, you&apos;ll get a personal walk log page to track every walk →
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
            {loading ? 'Connecting…' : 'Connect & Start Logging →'}
          </button>
        </div>
      </form>
    </div>
  )
}
