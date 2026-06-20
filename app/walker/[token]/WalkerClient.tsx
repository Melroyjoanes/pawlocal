'use client'

import { useState, useEffect, useCallback } from 'react'

interface WalkerClientProps {
  token: string
  dogName: string
  dogBreed: string | null
  healthNotes: string | null
  ownerFirstName: string
  walkerName: string
}

interface WalkLog {
  id: string
  duration_mins: number | null
  poop_count: number
  pee_count: number
  mood: string | null
  notes: string | null
  distance_km: number | null
  created_at: string
}

const MOOD_OPTIONS = [
  { value: 'great', label: '😄 Great' },
  { value: 'good', label: '🙂 Good' },
  { value: 'okay', label: '😐 Okay' },
  { value: 'tired', label: '😪 Tired' },
  { value: 'anxious', label: '😰 Anxious' },
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function WalkerClient({
  token,
  dogName,
  dogBreed,
  healthNotes,
  ownerFirstName,
  walkerName,
}: WalkerClientProps) {
  const [logs, setLogs] = useState<WalkLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [poopCount, setPoopCount] = useState(0)
  const [peeCount, setPeeCount] = useState(0)
  const [mood, setMood] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/walker/${token}/logs`)
      if (res.ok) {
        const data = await res.json()
        setLogs(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently fail — logs are a nice-to-have
    } finally {
      setLogsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function resetForm() {
    setDuration('')
    setDistance('')
    setPoopCount(0)
    setPeeCount(0)
    setMood('')
    setNotes('')
    setSubmitError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!duration || Number(duration) <= 0) {
      setSubmitError('Please enter the walk duration.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/walk-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_token: token,
          duration_mins: Number(duration),
          distance_km: distance ? Number(distance) : null,
          poop_count: poopCount,
          pee_count: peeCount,
          mood: mood || null,
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to submit. Please try again.')
        setSubmitting(false)
        return
      }

      // Success
      resetForm()
      setShowForm(false)
      setToast(`Walk logged! ✅ ${ownerFirstName} has been notified.`)
      setTimeout(() => setToast(null), 4000)
      fetchLogs()
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: '#FFFBEB' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#0A2F35] text-white rounded-2xl px-5 py-4 text-sm font-semibold text-center shadow-xl"
          style={{ fontFamily: 'var(--font-nunito)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-8 pb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
            PupStep 🐾
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[#0A2F35] mt-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
          Hi {walkerName} 👋
        </h1>

        {/* Dog card */}
        <div className="mt-4 rounded-2xl bg-white border border-slate-200 px-4 py-4 flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-3xl"
            style={{ background: '#FF8C52' }}>
            🐕
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-medium" style={{ fontFamily: 'var(--font-nunito)' }}>
              You&apos;re caring for
            </p>
            <p className="font-bold text-[#0A2F35] text-lg leading-tight" style={{ fontFamily: 'var(--font-fredoka)' }}>
              {dogName}
            </p>
            {dogBreed && (
              <p className="text-xs text-slate-400 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                {dogBreed}
              </p>
            )}
          </div>
        </div>

        {/* Health note pill */}
        {healthNotes && (
          <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-300 px-4 py-2.5 flex items-center gap-2">
            <span className="text-base flex-shrink-0">⚠️</span>
            <p className="text-sm text-amber-800 font-medium" style={{ fontFamily: 'var(--font-nunito)' }}>
              <strong>Health note:</strong> {healthNotes}
            </p>
          </div>
        )}
      </div>

      {/* Log a Walk section */}
      <div className="px-5 mb-6">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-5 rounded-2xl font-bold text-xl text-white shadow-lg active:scale-[0.98] transition-transform"
            style={{ background: '#FF8C52', fontFamily: 'var(--font-fredoka)' }}
          >
            🐕 Log Today&apos;s Walk
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-[#0A2F35] text-lg" style={{ fontFamily: 'var(--font-fredoka)' }}>
                Log a Walk
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-lg hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
              {/* Duration + Distance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    Duration *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="30"
                      min="1"
                      required
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base text-slate-800 pr-12 focus:outline-none focus:ring-2 focus:ring-[#FF8C52] min-h-[48px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                      mins
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    Distance
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder="1.5"
                      step="0.1"
                      min="0"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base text-slate-800 pr-10 focus:outline-none focus:ring-2 focus:ring-[#FF8C52] min-h-[48px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                      km
                    </span>
                  </div>
                </div>
              </div>

              {/* Poop + Pee counters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    Poop 💩
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPoopCount((c) => Math.max(0, c - 1))}
                      className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-600 flex items-center justify-center hover:border-slate-400 transition-colors active:bg-slate-50"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-xl font-bold text-[#0A2F35]"
                      style={{ fontFamily: 'var(--font-fredoka)' }}>
                      {poopCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPoopCount((c) => c + 1)}
                      className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-600 flex items-center justify-center hover:border-slate-400 transition-colors active:bg-slate-50"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    Pee 💧
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPeeCount((c) => Math.max(0, c - 1))}
                      className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-600 flex items-center justify-center hover:border-slate-400 transition-colors active:bg-slate-50"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-xl font-bold text-[#0A2F35]"
                      style={{ fontFamily: 'var(--font-fredoka)' }}>
                      {peeCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPeeCount((c) => c + 1)}
                      className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-600 flex items-center justify-center hover:border-slate-400 transition-colors active:bg-slate-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide"
                  style={{ fontFamily: 'var(--font-nunito)' }}>
                  Mood
                </label>
                <div className="flex gap-2 flex-wrap">
                  {MOOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMood(mood === opt.value ? '' : opt.value)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-all min-h-[44px]
                        ${mood === opt.value
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

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide"
                  style={{ fontFamily: 'var(--font-nunito)' }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything unusual?"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C52] resize-none"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
              </div>

              {submitError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md min-h-[56px]"
                style={{ background: '#FF8C52', fontFamily: 'var(--font-fredoka)' }}
              >
                {submitting ? 'Submitting…' : 'Submit Report ✓'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Walk history */}
      <div className="px-5">
        <h2 className="text-base font-bold text-[#0A2F35] mb-3" style={{ fontFamily: 'var(--font-fredoka)' }}>
          Recent Walks
        </h2>

        {logsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-8 text-center">
            <p className="text-3xl mb-2">🐾</p>
            <p className="text-sm text-slate-500" style={{ fontFamily: 'var(--font-nunito)' }}>
              No walks logged yet. Log your first walk above!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {log.mood && (
                      <span className="text-xl">
                        {MOOD_OPTIONS.find((m) => m.value === log.mood)?.label.split(' ')[0] ?? '🐕'}
                      </span>
                    )}
                    <div>
                      <p className="font-bold text-[#0A2F35] text-base leading-tight"
                        style={{ fontFamily: 'var(--font-fredoka)' }}>
                        {log.duration_mins ? `${log.duration_mins} min walk` : 'Walk'}
                      </p>
                      {log.distance_km && (
                        <p className="text-xs text-slate-400" style={{ fontFamily: 'var(--font-nunito)' }}>
                          {log.distance_km} km
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {formatDate(log.created_at)}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-slate-600" style={{ fontFamily: 'var(--font-nunito)' }}>
                  <span>💩 {log.poop_count}</span>
                  <span>💧 {log.pee_count}</span>
                  {log.mood && (
                    <span className="capitalize text-slate-400">{log.mood}</span>
                  )}
                </div>
                {log.notes && (
                  <p className="text-xs text-slate-500 mt-2 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
                    &ldquo;{log.notes}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bookmark hint */}
      <div className="px-5 mt-8">
        <div className="rounded-2xl bg-[#0A2F35] bg-opacity-5 border border-[#0A2F35] border-opacity-10 px-4 py-3 text-center">
          <p className="text-xs text-[#0D3D45] font-medium" style={{ fontFamily: 'var(--font-nunito)' }}>
            📌 Bookmark this page to log walks anytime
          </p>
        </div>
      </div>
    </div>
  )
}
