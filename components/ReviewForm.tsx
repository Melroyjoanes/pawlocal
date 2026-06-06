'use client'

import { useState, useEffect } from 'react'
import { StarPicker } from './StarRating'
import { createClient } from '@/lib/supabase/client'

interface Props {
  providerId: string
}

export default function ReviewForm({ providerId }: Props) {
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [rating, setRating]   = useState(0)
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')
  const [isVerified, setIsVerified] = useState(false)

  // Detect auth and pre-fill name from Google profile
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata ?? {}
        const fullName = meta.full_name ?? meta.name ?? ''
        if (fullName) setName(fullName)
        setIsVerified(true)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Please pick a star rating'); return }
    setError('')

    setSubmitting(true)

    const resolvedPhone = phone.trim() || null

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_id: providerId,
        rating,
        comment: comment.trim() || null,
        reviewer_name: name.trim(),
        reviewer_phone: resolvedPhone,
      }),
    })

    setSubmitting(false)
    if (res.ok) {
      setStep('done')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong. Try again.')
    }
  }

  if (step === 'done') {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">🙏</div>
        <p className="font-semibold text-foreground">Thanks for your review!</p>
        <p className="text-sm text-muted-foreground mt-1">
          We&apos;ll verify it and publish within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Verified badge incentive — shown when signed in */}
        {isVerified && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
            <span className="text-emerald-600 font-bold text-sm">✓</span>
            <p className="text-xs text-emerald-800 font-medium leading-snug">
              Signed-in reviews get a <strong>Verified</strong> badge — pet owners trust them more.
            </p>
          </div>
        )}

        {/* Soft nudge — shown when not signed in */}
        {!isVerified && (
          <div className="flex items-center justify-between bg-slate-50 border border-border rounded-xl px-3 py-2.5">
            <p className="text-xs text-slate-600 leading-snug">
              Sign in to get a ✓ <strong>Verified</strong> badge on your review
            </p>
            <a
              href={`/my-account`}
              className="text-xs font-semibold text-[var(--pl-teal)] hover:underline flex-shrink-0 ml-2"
            >
              Sign in →
            </a>
          </div>
        )}

        {/* Star picker */}
        <div>
          <p className="text-sm font-medium mb-2">Your rating *</p>
          <StarPicker value={rating} onChange={setRating} />
          {rating > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
            </p>
          )}
        </div>

        {/* Name — pre-filled from Google if signed in */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Your name *
            {isVerified && (
              <span className="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">✓ Verified</span>
            )}
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Priya Sharma"
            className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
          />
        </div>

        {/* Phone (optional — helps us verify) */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Phone <span className="text-muted-foreground font-normal">(optional — helps verify)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 43210"
            className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
          />
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Your experience <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            maxLength={300}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was the service? Would you recommend them?"
            rows={3}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] resize-none bg-white"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{comment.length}/300</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !rating || !name.trim()}
          className="w-full text-white py-3.5 rounded-2xl font-semibold text-sm transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--pl-teal)' }}
        >
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>

        <p className="text-xs text-center text-muted-foreground">
          Reviews are verified before publishing.
        </p>
      </form>
  )
}
