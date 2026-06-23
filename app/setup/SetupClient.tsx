'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userName: string | null
  justPaid?: boolean
}

const steps = [
  {
    number: 1,
    icon: '🐕',
    title: "Add your dog's profile",
    subtitle: 'Name, breed, any health notes your walker should know. Takes 30 seconds.',
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    circleBg: '#F59E0B',
  },
  {
    number: 2,
    icon: '📱',
    title: 'Get your QR code + 4-digit code',
    subtitle: 'We generate a unique code for your dog. Show both to your walker.',
    color: '#0D9488',
    bg: '#F0FDFA',
    border: '#99F6E4',
    circleBg: '#0D9488',
  },
  {
    number: 3,
    icon: '📋',
    title: 'Receive walk reports automatically',
    subtitle: 'After every walk, you get a GPS report on WhatsApp. No chasing needed.',
    color: '#16A34A',
    bg: '#F0FDF4',
    border: '#86EFAC',
    circleBg: '#16A34A',
  },
]

export default function SetupClient({ userName, justPaid }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [healthNotes, setHealthNotes] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Dog's name is required")
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          breed: breed.trim() || null,
          health_notes: healthNotes.trim() || null,
          owner_phone: ownerPhone.trim() || null,
          photo_url: photoUrl ?? null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Something went wrong')
      }

      const dog = await res.json()
      router.push(`/setup/qr?dog=${dog.id}&phone=${encodeURIComponent(ownerPhone.trim())}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFBEB',
        fontFamily: 'var(--font-nunito), sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '448px' }}>
        {!showForm ? (
          /* ── Preview Screen ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Logo */}
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: 'var(--font-fredoka), sans-serif',
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#0A2F35',
                  margin: '0 0 16px',
                }}
              >
                PupStep 🐾
              </p>
              <h1
                style={{
                  fontFamily: 'var(--font-fredoka), sans-serif',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#0A2F35',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {userName
                  ? `Hi ${userName}! Here's how PupStep works for you`
                  : "Set up your dog's walk reports"}
              </h1>
            </div>

            {justPaid && (
              <div style={{ background: 'rgba(13,148,136,0.1)', border: '1.5px solid rgba(13,148,136,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, textAlign: 'center', fontSize: 14, color: '#0A2F35', fontFamily: 'var(--font-nunito)' }}>
                🎉 <strong>Payment successful!</strong> Now set up your dog to start getting walk reports.
              </div>
            )}

            {/* Step cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {steps.map(step => (
                <div
                  key={step.number}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 1px 4px rgba(10,47,53,0.08)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                  }}
                >
                  {/* Numbered circle */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: step.circleBg,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-fredoka), sans-serif',
                      fontWeight: 700,
                      fontSize: '17px',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {step.number}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '20px' }}>{step.icon}</span>
                      <p
                        style={{
                          fontFamily: 'var(--font-fredoka), sans-serif',
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0A2F35',
                          margin: 0,
                        }}
                      >
                        {step.title}
                      </p>
                    </div>
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#6B7280',
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {step.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setShowForm(true)}
                style={{
                  width: '100%',
                  backgroundColor: '#F59E0B',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px 24px',
                  fontSize: '17px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-fredoka), sans-serif',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#D97706')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#F59E0B')}
              >
                Set up my dog →
              </button>
              <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0, textAlign: 'center' }}>
                Free forever · No app download · Works on any phone
              </p>
            </div>
          </div>
        ) : (
          /* ── Form Screen ── */
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '40px 36px',
              boxShadow: '0 4px 24px rgba(10, 47, 53, 0.08)',
            }}
          >
            {/* Back link */}
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0 0 20px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6B7280',
                fontFamily: 'var(--font-nunito), sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ← Back
            </button>

            {/* Header */}
            <div style={{ marginBottom: '28px', textAlign: 'center' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-fredoka), sans-serif',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#0A2F35',
                  margin: '0 0 8px',
                  lineHeight: 1.2,
                }}
              >
                Set up your dog&apos;s profile 🐕
              </h1>
              {userName && (
                <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 4px' }}>
                  Hey {userName}!
                </p>
              )}
              <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
                Your walker will see these details when they scan your QR code
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Dog Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: photoUrl ? 'transparent' : '#FFFBEB',
                    border: '2.5px dashed #FF8C52',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    position: 'relative',
                  }}
                >
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="dog preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <span>🐕</span>
                  )}
                  {uploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                      <span style={{ fontSize: '13px' }}>⏳</span>
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
                <p style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                  {photoUrl ? 'Tap to change photo' : 'Add a photo (optional)'}
                </p>
              </div>

              {/* Dog Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="dog-name"
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0A2F35',
                  }}
                >
                  Dog&apos;s name <span style={{ color: '#FF8C52' }}>*</span>
                </label>
                <input
                  id="dog-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Bruno, Coco, Milo"
                  required
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '2px solid #E5E7EB',
                    fontSize: '15px',
                    fontFamily: 'var(--font-nunito), sans-serif',
                    color: '#0A2F35',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#FF8C52')}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>

              {/* Breed */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="breed"
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0A2F35',
                  }}
                >
                  Breed{' '}
                  <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
                </label>
                <input
                  id="breed"
                  type="text"
                  value={breed}
                  onChange={e => setBreed(e.target.value)}
                  placeholder="e.g. Labrador, Pomeranian, Indian Pariah"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '2px solid #E5E7EB',
                    fontSize: '15px',
                    fontFamily: 'var(--font-nunito), sans-serif',
                    color: '#0A2F35',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#FF8C52')}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>

              {/* Health Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="health-notes"
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0A2F35',
                  }}
                >
                  Health notes{' '}
                  <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
                </label>
                <textarea
                  id="health-notes"
                  value={healthNotes}
                  onChange={e => setHealthNotes(e.target.value)}
                  placeholder="Allergies, medications, anything your walker should know"
                  rows={3}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '2px solid #E5E7EB',
                    fontSize: '15px',
                    fontFamily: 'var(--font-nunito), sans-serif',
                    color: '#0A2F35',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#FF8C52')}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>

              {/* Owner Phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="owner-phone"
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0A2F35',
                  }}
                >
                  Your WhatsApp number (for walk reports){' '}
                  <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
                </label>
                <input
                  id="owner-phone"
                  type="tel"
                  inputMode="numeric"
                  value={ownerPhone}
                  onChange={e => setOwnerPhone(e.target.value)}
                  placeholder="9876543210"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '2px solid #E5E7EB',
                    fontSize: '15px',
                    fontFamily: 'var(--font-nunito), sans-serif',
                    color: '#0A2F35',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#FF8C52')}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '14px',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#FDB896' : '#FF8C52',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-fredoka), sans-serif',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s, transform 0.1s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={e => {
                  if (!loading) (e.currentTarget.style.backgroundColor = '#F07030')
                }}
                onMouseLeave={e => {
                  if (!loading) (e.currentTarget.style.backgroundColor = '#FF8C52')
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Generating...
                  </>
                ) : (
                  'Generate QR Code →'
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
