'use client'

import { useState } from 'react'
import { StarPicker } from './StarRating'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Please pick a star rating'); return }
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_id: providerId,
        rating,
        comment: comment.trim() || null,
        reviewer_name: name.trim(),
        reviewer_phone: phone.trim() || null,
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

      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Your name *</label>
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
