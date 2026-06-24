'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  user: { id: string; fullName: string | null } | null
  justPaid?: boolean
  recover?: boolean
}

const HEALTH_CHIPS = [
  'No chicken 🍗',
  'Pulls on leash 🦮',
  'Scared of traffic 🚗',
  'Scared of loud noises 🔊',
  'Aggressive with dogs 🐕',
  'Epilepsy ⚠️',
  'Heart condition ❤️',
  'Friendly with strangers 🤝',
]

export default function SetupClient({ user, justPaid, recover }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [healthNotes, setHealthNotes] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const autoSubmittedRef = useRef(false)

  // Recover draft after Google OAuth redirect
  useEffect(() => {
    if (!recover || !user || autoSubmittedRef.current) return
    const raw = sessionStorage.getItem('pup-setup-draft')
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as { name: string; healthNotes: string; ownerPhone: string }
      setName(draft.name || '')
      setHealthNotes(draft.healthNotes || '')
      setOwnerPhone(draft.ownerPhone || '')
      sessionStorage.removeItem('pup-setup-draft')
      autoSubmittedRef.current = true
      // Small delay so state settles before submit
      setTimeout(() => submitDog(user.id, draft.name, draft.healthNotes, draft.ownerPhone, null), 400)
    } catch {
      sessionStorage.removeItem('pup-setup-draft')
    }
  }, [recover, user]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleChip(chip: string) {
    setHealthNotes(prev => {
      const plain = chip.replace(/\s[\u{1F300}-\u{1FFFF}⚠️❤️🤝🦮]/gu, '').trim()
      // Check if already in notes (by the text part)
      if (prev.includes(plain)) {
        return prev.replace(plain, '').replace(/\s*·\s*·\s*/g, ' · ').replace(/^[\s·]+|[\s·]+$/g, '').trim()
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

  async function submitDog(
    userId: string,
    dogName: string,
    notes: string,
    phone: string,
    photo: string | null
  ) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dogName.trim(),
          health_notes: notes.trim() || null,
          owner_phone: phone.trim() || null,
          photo_url: photo,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Something went wrong')
      }
      const dog = await res.json()
      router.push(`/setup/qr?dog=${dog.id}&phone=${encodeURIComponent(phone.trim())}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("What's your dog's name?"); return }

    if (!user) {
      // Save draft → trigger Google Sign-In → come back with ?recover=1
      sessionStorage.setItem('pup-setup-draft', JSON.stringify({ name, healthNotes, ownerPhone }))
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/setup?recover=1` },
      })
      return
    }

    await submitDog(user.id, name, healthNotes, ownerPhone, photoUrl)
  }

  const dogFirstName = name.trim().split(' ')[0] || 'your dog'

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#FFFBEB',
      fontFamily: 'var(--font-nunito), sans-serif',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '32px 16px 48px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 22, fontWeight: 700, color: '#0A2F35', margin: '0 0 6px' }}>
            PupStep 🐾
          </p>
          <h1 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 26, fontWeight: 700, color: '#0A2F35', margin: '0 0 6px', lineHeight: 1.25 }}>
            {user?.fullName ? `Hi ${user.fullName.split(' ')[0]}! Tell us about your dog` : "Tell us about your dog"}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            Your walker will see these details. Takes 30 seconds.
          </p>
        </div>

        {justPaid && (
          <div style={{ background: 'rgba(13,148,136,0.1)', border: '1.5px solid rgba(13,148,136,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 20, textAlign: 'center', fontSize: 14, color: '#0A2F35' }}>
            🎉 <strong>Payment successful!</strong> Now set up your dog.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Dog photo — only when logged in (Supabase Storage needs auth) */}
          {user && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
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
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                    <span style={{ fontSize: 12 }}>⏳</span>
                  </div>
                )}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoChange} />
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                {photoUrl ? 'Tap to change photo' : 'Add a photo (optional)'}
              </p>
            </div>
          )}

          {/* Dog Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="dog-name" style={{ fontSize: 14, fontWeight: 700, color: '#0A2F35' }}>
              What&apos;s your dog&apos;s name? <span style={{ color: '#FF8C52' }}>*</span>
            </label>
            <input
              id="dog-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Bruno, Coco, Max..."
              autoFocus
              style={{
                padding: '13px 16px', borderRadius: 12, border: '2px solid #E5E7EB',
                fontSize: 16, fontFamily: 'var(--font-nunito)', color: '#0A2F35',
                outline: 'none', background: '#fff',
              }}
              onFocus={e => (e.target.style.borderColor = '#FF8C52')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>

          {/* Health notes — chips + optional textarea */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#0A2F35' }}>
              Anything the walker should know?{' '}
              <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
            </label>
            {/* Quick chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {HEALTH_CHIPS.map(chip => {
                const plain = chip.replace(/\s[\u{1F300}-\u{1FFFF}⚠️❤️🤝🦮]/gu, '').trim()
                const active = healthNotes.includes(plain)
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleChip(chip)}
                    style={{
                      padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${active ? '#FF8C52' : '#E5E7EB'}`,
                      background: active ? '#FFF0E8' : '#fff',
                      color: active ? '#C05A20' : '#6B7280',
                      cursor: 'pointer', fontFamily: 'var(--font-nunito)',
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
              placeholder="Or type anything else — allergies, medications, fears..."
              rows={2}
              style={{
                padding: '12px 14px', borderRadius: 12, border: '2px solid #E5E7EB',
                fontSize: 14, fontFamily: 'var(--font-nunito)', color: '#0A2F35',
                outline: 'none', resize: 'none', background: '#fff',
              }}
              onFocus={e => (e.target.style.borderColor = '#FF8C52')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>

          {/* WhatsApp number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="owner-phone" style={{ fontSize: 14, fontWeight: 700, color: '#0A2F35' }}>
              Your WhatsApp number{' '}
              <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(for walk reports)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '2px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: '#fff', transition: 'border-color 0.15s' }}
              onFocus={() => {}} onBlur={() => {}}>
              <span style={{ padding: '13px 10px 13px 14px', fontSize: 15, color: '#6B7280', fontWeight: 700, fontFamily: 'var(--font-nunito)', userSelect: 'none' }}>+91</span>
              <input
                id="owner-phone"
                type="tel"
                inputMode="numeric"
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                style={{
                  flex: 1, padding: '13px 14px 13px 0', border: 'none', outline: 'none',
                  fontSize: 15, fontFamily: 'var(--font-nunito)', color: '#0A2F35', background: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '12px 16px', borderRadius: 10, fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || uploading}
            style={{
              background: loading ? '#FDB896' : '#FF8C52',
              color: '#fff', border: 'none', borderRadius: 14,
              padding: '16px 24px', fontSize: 17, fontWeight: 700,
              fontFamily: 'var(--font-fredoka)', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              minHeight: 56, transition: 'background 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#e87a40' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#FF8C52' }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Setting up {dogFirstName}...
              </>
            ) : user ? (
              `Set up ${dogFirstName}'s profile →`
            ) : (
              `Continue with Google to save ${dogFirstName}'s profile →`
            )}
          </button>

          {!user && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: '-8px 0 0' }}>
              We&apos;ll save your details after you sign in
            </p>
          )}

        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
