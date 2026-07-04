'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/AuthModal'
import { LoadingButton } from '@/components/LoadingButton'
import { trackEvent } from '@/lib/analytics'

interface Props {
  user: { id: string; fullName: string | null } | null
  justPaid?: boolean
  recover?: boolean
}

interface DraftData {
  name: string
  careFocuses: string[]
  healthNotes: string
  walkingInstructions: string
  photoUrl: string | null
  parentName: string
  ownerPhone: string
  walkTimeBucket: string | null
}

const HEALTH_CHIPS = [
  'No chicken 🍗',
  'Scared of traffic 🚗',
  'Pulls on leash 🦮',
  'Stomach upset ⚠️',
  'Senior dog 🐕',
  'No treats',
]

const CARE_FOCUS_OPTIONS = [
  { key: 'normal', emoji: '🐾', label: 'Normal walk' },
  { key: 'stomach', emoji: '💩', label: 'Stomach monitoring' },
  { key: 'recovery', emoji: '🩹', label: 'Recovery / injury' },
  { key: 'anxiety', emoji: '😰', label: 'Anxiety / fear' },
  { key: 'senior', emoji: '🐕', label: 'Senior dog' },
  { key: 'puppy', emoji: '🐶', label: 'Puppy training' },
]

const WALK_TIME_OPTIONS = [
  { key: 'morning', emoji: '🌅', label: 'Morning' },
  { key: 'afternoon', emoji: '☀️', label: 'Afternoon' },
  { key: 'evening', emoji: '🌆', label: 'Evening' },
]

// Teal brand color
const TEAL = 'oklch(0.48 0.17 196)'
const TEAL_LIGHT = 'oklch(0.95 0.04 196)'

export default function SetupClient({ user, justPaid, recover }: Props) {
  const router = useRouter()

  // Always start at step 1 — welcome screen removed entirely
  const [step, setStep] = useState(1)

  // Dog details
  const [name, setName] = useState('')
  const [careFocuses, setCareFocuses] = useState<string[]>(['normal'])
  const [healthNotes, setHealthNotes] = useState('')
  const [walkingInstructions, setWalkingInstructions] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [walkTimeBucket, setWalkTimeBucket] = useState<string | null>(null)

  // Contact details
  const [parentName, setParentName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')

  // UI state
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const autoSubmittedRef = useRef(false)

  const dogFirstName = name.trim().split(' ')[0] || 'your dog'

  // Recover draft after Google OAuth redirect
  useEffect(() => {
    if (!recover || !user || autoSubmittedRef.current) return
    const raw = localStorage.getItem('pup-setup-draft')
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as DraftData
      setName(draft.name || '')
      setCareFocuses(draft.careFocuses?.length ? draft.careFocuses : ['normal'])
      setHealthNotes(draft.healthNotes || '')
      setWalkingInstructions(draft.walkingInstructions || '')
      setPhotoUrl(draft.photoUrl || null)
      setWalkTimeBucket(draft.walkTimeBucket || null)
      setParentName(draft.parentName || '')
      setOwnerPhone(draft.ownerPhone || '')
      localStorage.removeItem('pup-setup-draft')

      // WhatsApp number is mandatory — if the recovered draft is missing a valid
      // number, don't auto-submit. Land the user on step 2 with an inline error
      // instead so they can fill it in before continuing.
      const draftDigits = (draft.ownerPhone || '').replace(/\D/g, '')
      if (!draft.ownerPhone?.trim() || draftDigits.length !== 10) {
        autoSubmittedRef.current = true
        setStep(2)
        setError('Please enter your 10-digit WhatsApp number')
        return
      }

      autoSubmittedRef.current = true
      setSavingDraft(true)
      setTimeout(() => submitDog(user.id, draft), 300)
    } catch {
      localStorage.removeItem('pup-setup-draft')
    }
  }, [recover, user]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleCareFocus(value: string) {
    if (value === 'normal') {
      // Normal walk deselects everything else
      setCareFocuses(['normal'])
    } else {
      setCareFocuses(prev => {
        // Deselect 'normal' when selecting a specific focus
        const withoutNormal = prev.filter(v => v !== 'normal')
        if (withoutNormal.includes(value)) {
          // Deselecting last specific focus reverts to normal
          const remaining = withoutNormal.filter(v => v !== value)
          return remaining.length ? remaining : ['normal']
        }
        return [...withoutNormal, value] // select
      })
    }
  }

  function toggleWalkTime(value: string) {
    setWalkTimeBucket(prev => (prev === value ? null : value))
  }

  function toggleChip(chip: string) {
    const plain = chip.replace(/\s[\u{1F300}-\u{1FFFF}⚠️❤️🤝🦮🍗🚗🐕]/gu, '').trim()
    setHealthNotes(prev => {
      if (prev.includes(plain)) {
        return prev
          .replace(plain, '')
          .replace(/\s*·\s*·\s*/g, ' · ')
          .replace(/^[\s·]+|[\s·]+$/g, '')
          .trim()
      }
      return prev ? `${prev} · ${plain}` : plain
    })
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `dog-photos/${Date.now()}.${ext}`
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.storage.from('provider-photos').upload(path, file)
      const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
      setPhotoUrl(data.publicUrl)
    } catch (err) {
      console.error('Photo upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  async function submitDog(userId: string, data?: DraftData) {
    const d = data ?? { name, careFocuses, healthNotes, walkingInstructions, photoUrl, parentName, ownerPhone, walkTimeBucket }
    setLoading(true)
    setError(null)
    try {
      const combinedNotes = [d.healthNotes, d.walkingInstructions].filter(Boolean).join('\n\n') || null
      const res = await fetch('/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: d.name.trim(),
          health_notes: combinedNotes,
          care_focus: (d.careFocuses ?? ['normal']).join(','),
          owner_phone: d.ownerPhone.trim() || null,
          photo_url: d.photoUrl || null,
          walk_time_bucket: d.walkTimeBucket || null,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error((json as { error?: string }).error ?? 'Something went wrong')
      }
      const dog = await res.json() as { id: string }

      // Update parent name if provided
      if (d.parentName?.trim()) {
        try {
          await fetch('/api/profile/name', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: d.parentName.trim() }),
          })
        } catch {
          // Non-critical — ignore if endpoint doesn't exist
        }
      }

      trackEvent('dog_created', { dog_id: dog.id })
      router.push(`/setup/qr?dog=${dog.id}&phone=${encodeURIComponent(d.ownerPhone.trim())}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
      setSavingDraft(false)
    }
  }

  async function handleCreateWalkerLink() {
    setError(null)
    // WhatsApp number is required — reports are delivered here
    const digits = ownerPhone.replace(/\D/g, '')
    if (!ownerPhone.trim() || digits.length !== 10) {
      setError('Please enter your 10-digit WhatsApp number')
      return
    }

    if (!user) {
      // Open auth modal — email OTP path keeps user on same page, draft stays in memory
      setAuthOpen(true)
      return
    }

    await submitDog(user.id)
  }

  function handleStep1Continue() {
    setError(null)
    if (!name.trim()) {
      setError("What's your dog's name?")
      return
    }
    setStep(2)
  }

  // Step indicator dots (shown on steps 1 and 2)
  function StepDots({ current }: { current: number }) {
    return (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
        {[1, 2].map(i => (
          <div
            key={i}
            style={{
              height: 6,
              width: current >= i ? 32 : 20,
              borderRadius: 100,
              background: current >= i ? TEAL : '#D1D5DB',
              transition: 'all 0.25s',
            }}
          />
        ))}
      </div>
    )
  }

  // Saving draft / loading screen
  if (savingDraft || (loading && autoSubmittedRef.current)) {
    return (
      <div style={{
        minHeight: '100dvh',
        backgroundColor: '#FFFBEB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-nunito), sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48,
            border: `4px solid ${TEAL}33`,
            borderTopColor: TEAL,
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            margin: '0 auto 20px',
          }} />
          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color: '#0A2F35', margin: '0 0 6px' }}>
            Saving {name || 'your dog'}&apos;s profile...
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            Just a moment ✨
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100dvh',
    backgroundColor: '#FFFBEB',
    fontFamily: 'var(--font-nunito), sans-serif',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '32px 16px 48px',
  }

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
  }

  const inputStyle: React.CSSProperties = {
    padding: '13px 16px',
    borderRadius: 12,
    border: '2px solid #E5E7EB',
    fontSize: 16,
    fontFamily: 'var(--font-nunito)',
    color: '#0A2F35',
    outline: 'none',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#0A2F35',
  }

  const ctaStyle: React.CSSProperties = {
    background: '#FF8C52',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    padding: '16px 24px',
    fontSize: 17,
    fontWeight: 700,
    fontFamily: 'var(--font-fredoka)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    width: '100%',
    transition: 'background 0.15s',
  }

  // ─── SCREEN 0: Welcome ───────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, paddingTop: 24 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 24, fontWeight: 700, color: TEAL, margin: '0 0 24px' }}>
              PupStep 🐾
            </p>
            <h1 style={{
              fontFamily: 'var(--font-fredoka)',
              fontSize: 30,
              fontWeight: 700,
              color: '#0A2F35',
              margin: '0 0 12px',
              lineHeight: 1.2,
            }}>
              Set up your dog&apos;s walk report
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', margin: '0 auto', maxWidth: 320, lineHeight: 1.5 }}>
              Create a private walker link. Your walker logs walks. You get GPS reports on WhatsApp.
            </p>
          </div>

          {/* Three promise bullets */}
          <div style={{
            background: '#fff',
            borderRadius: 18,
            border: '1.5px solid #F3F4F6',
            padding: '20px 24px',
            marginBottom: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            {[
              { emoji: '🐕', text: "Add your dog's details" },
              { emoji: '📱', text: 'Share a link with your walker' },
              { emoji: '📊', text: 'Get walk reports on WhatsApp' },
            ].map(item => (
              <div key={item.emoji} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{item.emoji}</span>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0A2F35' }}>{item.text}</p>
              </div>
            ))}
          </div>

          {justPaid && (
            <div style={{
              background: 'rgba(13,148,136,0.1)',
              border: '1.5px solid rgba(13,148,136,0.3)',
              borderRadius: 14,
              padding: '12px 16px',
              marginBottom: 20,
              textAlign: 'center',
              fontSize: 14,
              color: '#0A2F35',
            }}>
              🎉 <strong>Payment successful!</strong> Now set up your dog.
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep(1)}
            style={ctaStyle}
            onMouseEnter={e => { e.currentTarget.style.background = '#e87a40' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FF8C52' }}
          >
            Start setup →
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 14 }}>
            Takes about 60 seconds
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ─── SCREEN 1: Dog Details ───────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          {/* Back + progress */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => { setStep(0); setError(null) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 22, color: '#6B7280', padding: '4px 8px 4px 0',
                display: 'flex', alignItems: 'center',
              }}
              aria-label="Back"
            >
              ←
            </button>
            <div style={{ flex: 1 }}>
              <StepDots current={1} />
            </div>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 24, fontWeight: 700, color: '#0A2F35', margin: '0 0 4px' }}>
              Tell us about your dog
            </h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
              Your walker will see these details before every walk.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Dog photo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      width: 88, height: 88, borderRadius: '50%',
                      background: photoUrl ? 'transparent' : '#FFFBEB',
                      border: '2.5px dashed #FF8C52',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 34, position: 'relative',
                    }}
                  >
                    {photoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={photoUrl} alt="dog" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : <span>🐕</span>}
                    {uploading && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(255,255,255,0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%',
                      }}>
                        <span style={{ fontSize: 12 }}>⏳</span>
                      </div>
                    )}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                    {photoUrl
                      ? `Tap to change ${dogFirstName}'s photo`
                      : `Add ${dogFirstName === 'your dog' ? "Bruno's" : `${dogFirstName}'s`} photo`}
                  </p>
                </>
              ) : (
                <div style={{
                  width: 88, height: 88, borderRadius: '50%',
                  background: '#F3F4F6',
                  border: '2.5px dashed #D1D5DB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 2,
                }}>
                  <span style={{ fontSize: 24 }}>📷</span>
                </div>
              )}
              {!user && (
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, textAlign: 'center' }}>
                  Add photo after sign-in
                </p>
              )}
            </div>

            {/* Dog name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="dog-name" style={labelStyle}>
                Dog&apos;s name <span style={{ color: '#FF8C52' }}>*</span>
              </label>
              <input
                id="dog-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Bruno, Max, Coco..."
                autoFocus
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#FF8C52')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            {/* Care focus */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>Care focus</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CARE_FOCUS_OPTIONS.map(opt => {
                  const selected = careFocuses.includes(opt.key)
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleCareFocus(opt.key)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 12,
                        border: `2px solid ${selected ? TEAL : '#E5E7EB'}`,
                        background: selected ? TEAL_LIGHT : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                      <span style={{
                        fontFamily: 'var(--font-fredoka)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: selected ? '#0A2F35' : '#6B7280',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Health notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>Health notes for your walker</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {HEALTH_CHIPS.map(chip => {
                  const plain = chip.replace(/\s[\u{1F300}-\u{1FFFF}⚠️❤️🤝🦮🍗🚗🐕]/gu, '').trim()
                  const active = healthNotes.includes(plain)
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleChip(chip)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 100,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1.5px solid ${active ? '#FF8C52' : '#E5E7EB'}`,
                        background: active ? '#FFF0E8' : '#fff',
                        color: active ? '#C05A20' : '#6B7280',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-nunito)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {chip}
                    </button>
                  )
                })}
              </div>
              <textarea
                value={healthNotes}
                onChange={e => setHealthNotes(e.target.value)}
                placeholder="Anything else your walker should know..."
                rows={2}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '2px solid #E5E7EB',
                  fontSize: 14,
                  fontFamily: 'var(--font-nunito)',
                  color: '#0A2F35',
                  outline: 'none',
                  resize: 'none',
                  background: '#fff',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
                onFocus={e => (e.target.style.borderColor = '#FF8C52')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            {/* Walking instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>
                Walking instructions{' '}
                <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={walkingInstructions}
                onChange={e => setWalkingInstructions(e.target.value)}
                placeholder="e.g. Offer water after walk · Stay in Juhu lanes · Max 30 min"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#FF8C52')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            {/* Usual walk time */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>
                Usual walk time{' '}
                <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {WALK_TIME_OPTIONS.map(opt => {
                  const selected = walkTimeBucket === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleWalkTime(opt.key)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 12,
                        border: `2px solid ${selected ? TEAL : '#E5E7EB'}`,
                        background: selected ? TEAL_LIGHT : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{opt.emoji}</span>
                      <span style={{
                        fontFamily: 'var(--font-fredoka)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: selected ? '#0A2F35' : '#6B7280',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '12px 16px',
                borderRadius: 10,
                fontSize: 14,
              }}>
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={handleStep1Continue}
              style={ctaStyle}
              onMouseEnter={e => { e.currentTarget.style.background = '#e87a40' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FF8C52' }}
            >
              Continue →
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ─── SCREEN 2: Contact Details ───────────────────────────────────────────
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Back + progress */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => { setStep(1); setError(null) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, color: '#6B7280', padding: '4px 8px 4px 0',
              display: 'flex', alignItems: 'center',
            }}
            aria-label="Back"
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <StepDots current={2} />
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 24, fontWeight: 700, color: '#0A2F35', margin: '0 0 4px' }}>
            Where should walk reports go?
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            Your walker will send GPS reports to your WhatsApp.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Parent name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="parent-name" style={labelStyle}>
              What&apos;s your name?
            </label>
            <input
              id="parent-name"
              type="text"
              value={parentName}
              onChange={e => setParentName(e.target.value)}
              placeholder="Priya, Rohit, Ananya..."
              autoFocus
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#FF8C52')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>

          {/* WhatsApp number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="owner-phone" style={labelStyle}>
              Your WhatsApp number <span style={{ color: '#FF8C52' }}>*</span>
            </label>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>
              Your walker&apos;s reports arrive here.
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '2px solid #E5E7EB',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#fff',
            }}
              onFocus={() => {}}
              onBlur={() => {}}
            >
              <span style={{
                padding: '13px 10px 13px 14px',
                fontSize: 15,
                color: '#6B7280',
                fontWeight: 700,
                fontFamily: 'var(--font-nunito)',
                userSelect: 'none',
                flexShrink: 0,
              }}>
                +91
              </span>
              <input
                id="owner-phone"
                type="tel"
                inputMode="numeric"
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                style={{
                  flex: 1,
                  padding: '13px 14px 13px 0',
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  fontFamily: 'var(--font-nunito)',
                  color: '#0A2F35',
                  background: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          {/* CTA */}
          <LoadingButton
            onClick={handleCreateWalkerLink}
            loading={loading}
            loadingText="Creating link…"
            style={{ ...ctaStyle, background: '#FF8C52' }}
          >
            Create walker link →
          </LoadingButton>

          {!user && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: '-8px 0 0' }}>
              You&apos;ll sign in to save — feels like saving, not a wall 🔐
            </p>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        message="Sign in to save your dog's profile"
        onSignedIn={(userId) => {
          setAuthOpen(false)
          submitDog(userId)
        }}
      />
    </div>
  )
}
