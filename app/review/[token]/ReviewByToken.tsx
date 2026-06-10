'use client'

import { useState } from 'react'

type Props = {
  token: string
  providerId: string
  providerName: string
}

export default function ReviewByToken({ token, providerName }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating'); return }
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!phone.trim()) { setError('Please enter your phone number'); return }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reviews/by-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, rating, reviewer_name: name.trim(), reviewer_phone: phone.trim(), comment: comment.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit review')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-border p-8 shadow-sm text-center space-y-4">
          <div className="text-5xl">🐾</div>
          <h2 className="font-display text-xl font-bold text-stone-900">
            Thank you!
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            Your review will appear after verification 🐾
          </p>
        </div>
      </div>
    )
  }

  const displayRating = hovered || rating

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full space-y-4">
        {/* Header */}
        <div className="text-center space-y-1 mb-2">
          <div className="text-3xl">🐾</div>
          <h1 className="font-display text-2xl font-bold text-stone-900">
            Leave a review
          </h1>
          <p className="text-sm text-muted-foreground">
            Share your experience with <span className="font-semibold text-stone-700">{providerName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Star rating */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-3">Your rating <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-3xl transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                >
                  <span className={displayRating >= star ? 'text-amber-400' : 'text-stone-200'}>★</span>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Your name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Comment <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="What did you love? Any suggestions?"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] focus:border-transparent resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'oklch(0.48 0.17 196)' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting…
              </span>
            ) : 'Submit review'}
          </button>
        </form>
      </div>
    </div>
  )
}
