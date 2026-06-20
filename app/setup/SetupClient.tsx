'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userName: string | null
}

export default function SetupClient({ userName }: Props) {
  const router = useRouter()

  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [healthNotes, setHealthNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Something went wrong')
      }

      const dog = await res.json()
      router.push(`/setup/qr?dog=${dog.id}`)
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
      <div
        style={{
          width: '100%',
          maxWidth: '448px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '40px 36px',
          boxShadow: '0 4px 24px rgba(10, 47, 53, 0.08)',
        }}
      >
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

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
