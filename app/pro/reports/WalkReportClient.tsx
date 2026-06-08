'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

// Run this in Supabase SQL editor:
// ALTER TABLE walk_reports ADD COLUMN start_location text;
// ALTER TABLE walk_reports ADD COLUMN end_location text;

type WalkReport = {
  id: string
  token: string
  dog_name: string
  duration_mins: number
  poop_count: number
  pee_count: number
  notes: string | null
  photo_url: string | null
  walk_date: string
  created_at: string
  start_location: string | null
  end_location: string | null
  route_points?: {lat: number, lng: number}[] | null
  distance_meters?: number | null
  poop_events?: {lat: number, lng: number, time: string}[] | null
  pee_events?: {lat: number, lng: number, time: string}[] | null
}

type Props = {
  initialReports: WalkReport[]
  providerId: string
  providerName: string
  verificationTier: string | null
}

const EASE_OUT = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } as const

const CLAY_CARD: React.CSSProperties = {
  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
  boxShadow:
    'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
  border: '1px solid rgba(226,220,200,0.7)',
}

const TEAL_BUTTON: React.CSSProperties = {
  background:
    'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
  color: '#fff',
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function shareUrl(token: string): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/walk-report/${token}`
}

// ─── Past Report Card ────────────────────────────────────────────────────────

function ReportCard({
  report,
  onDelete,
}: {
  report: WalkReport
  onDelete: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleCopy() {
    const url = shareUrl(report.token)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    onDelete(report.id) // optimistic
    try {
      await fetch(`/api/walk-reports/${report.token}`, { method: 'DELETE' })
    } catch {
      // already removed optimistically; no rollback needed for MVP
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={EASE_OUT}
      className="rounded-2xl overflow-hidden"
      style={CLAY_CARD}
    >
      <div className="flex gap-3 p-4">
        {/* Photo thumbnail */}
        {report.photo_url ? (
          <img
            src={report.photo_url}
            alt={report.dog_name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
            style={{ background: 'oklch(0.48 0.17 196 / 0.08)' }}>
            🐾
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base text-stone-900 leading-tight truncate">
              {report.dog_name}
            </h3>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors text-sm font-bold"
              aria-label="Delete report"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">{formatDate(report.walk_date)}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-stone-500">
            <span>⏱ {report.duration_mins} min</span>
            {report.poop_count > 0 && <span>💩 ×{report.poop_count}</span>}
            {report.pee_count > 0 && <span>💧 ×{report.pee_count}</span>}
            {report.distance_meters != null && report.distance_meters > 0 && (
              <span className="text-xs text-stone-400">📏 {report.distance_meters >= 1000 ? `${(report.distance_meters/1000).toFixed(1)}km` : `${Math.round(report.distance_meters)}m`}</span>
            )}
          </div>
          {report.notes && (
            <p className="text-xs text-stone-400 italic mt-1.5 line-clamp-1">&ldquo;{report.notes}&rdquo;</p>
          )}
          {report.start_location && report.end_location && (
            <p className="text-xs text-stone-400 mt-1">
              📍 {report.start_location} → {report.end_location}
            </p>
          )}
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 w-full py-3 text-xs font-bold transition-all border-t"
        style={{
          borderColor: 'rgba(226,220,200,0.7)',
          color: copied ? '#15803D' : 'oklch(0.44 0.16 196)',
          background: copied ? '#F0FDF4' : 'transparent',
        }}
      >
        {copied ? '✓ Copied!' : '🔗 Copy shareable link'}
      </button>
    </motion.div>
  )
}

// ─── Activity Counter Button ──────────────────────────────────────────────────

function ActivityCounter({
  emoji,
  label,
  count,
  onChange,
}: {
  emoji: string
  label: string
  count: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{label}</span>
      <button
        type="button"
        onClick={() => onChange(count + 1)}
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl transition-transform active:scale-95 select-none"
        style={{
          background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
          boxShadow:
            'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
          border: '1px solid rgba(226,220,200,0.7)',
        }}
        aria-label={`Add ${label}`}
      >
        {emoji}
      </button>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, count - 1))}
          className="w-8 h-8 rounded-full bg-stone-100 text-stone-400 font-bold text-lg flex items-center justify-center transition-colors hover:bg-stone-200 active:scale-95"
          aria-label={`Remove ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center text-xl font-bold text-stone-800">{count}</span>
        <button
          type="button"
          onClick={() => onChange(count + 1)}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg text-white transition-colors active:scale-95"
          style={{ background: 'oklch(0.48 0.17 196)' }}
          aria-label={`Add ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

// ─── Duration Stepper ─────────────────────────────────────────────────────────

function DurationStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  const dec = () => onChange(Math.max(5, value - 5))
  const inc = () => onChange(Math.min(180, value + 5))

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={dec}
        disabled={value <= 5}
        className="w-11 h-11 rounded-xl bg-stone-100 text-stone-500 font-bold text-xl flex items-center justify-center transition-colors hover:bg-stone-200 disabled:opacity-30 active:scale-95"
      >
        −
      </button>
      <div className="flex-1 text-center">
        <span className="text-3xl font-bold text-stone-900">{value}</span>
        <span className="text-sm text-stone-400 ml-1">min</span>
      </div>
      <button
        type="button"
        onClick={inc}
        disabled={value >= 180}
        className="w-11 h-11 rounded-xl font-bold text-xl flex items-center justify-center text-white transition-colors disabled:opacity-30 active:scale-95"
        style={{ background: 'oklch(0.48 0.17 196)' }}
      >
        +
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WalkReportClient({
  initialReports,
  providerId,
  providerName,
}: Props) {
  const [reports, setReports] = useState<WalkReport[]>(initialReports)

  // Form state
  const [dogName, setDogName] = useState('')
  const [duration, setDuration] = useState(30)
  const [poopCount, setPoopCount] = useState(0)
  const [peeCount, setPeeCount] = useState(0)
  const [notes, setNotes] = useState('')
  const [startLocation, setStartLocation] = useState('')
  const [endLocation, setEndLocation] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successToken, setSuccessToken] = useState<string | null>(null)
  const [successCopied, setSuccessCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function resetForm() {
    setDogName('')
    setDuration(30)
    setPoopCount(0)
    setPeeCount(0)
    setNotes('')
    setStartLocation('')
    setEndLocation('')
    setPhotoUrl(null)
    setPhotoPreview(null)
    setSuccessToken(null)
    setSuccessCopied(false)
    setSubmitError(null)
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPhotoPreview(objectUrl)
    setUploading(true)

    try {
      const path = `${providerId}/${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('walk-report-photos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) throw error

      const { data: publicData } = supabase.storage
        .from('walk-report-photos')
        .getPublicUrl(path)

      setPhotoUrl(publicData.publicUrl)
    } catch (err) {
      console.error('Photo upload failed:', err)
      // Keep preview but clear url — submit will proceed without photo
      setPhotoUrl(null)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dogName.trim()) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/walk-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dog_name: dogName,
          duration_mins: duration,
          poop_count: poopCount,
          pee_count: peeCount,
          notes: notes.trim() || null,
          photo_url: photoUrl,
          walk_date: new Date().toISOString(),
          start_location: startLocation.trim() || null,
          end_location: endLocation.trim() || null,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')

      const newReport: WalkReport = {
        id: json.id,
        token: json.token,
        dog_name: dogName,
        duration_mins: duration,
        poop_count: poopCount,
        pee_count: peeCount,
        notes: notes.trim() || null,
        photo_url: photoUrl,
        walk_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        start_location: startLocation.trim() || null,
        end_location: endLocation.trim() || null,
      }

      setReports(prev => [newReport, ...prev])
      setSuccessToken(json.token)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSuccessCopy() {
    if (!successToken) return
    const url = shareUrl(successToken)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setSuccessCopied(true)
    setTimeout(() => setSuccessCopied(false), 2000)
  }

  function handleDelete(id: string) {
    setReports(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="min-h-dvh pb-28" style={{ background: 'oklch(0.975 0.006 85)' }}>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-display text-xl text-stone-900">Walk Reports</h1>
          <span className="text-xs text-stone-400 font-medium truncate max-w-[160px]">{providerName}</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* ── Start a Walk CTA ── */}
        <a
          href="/pro/reports/live"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-base transition-all"
          style={{
            background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
            boxShadow: '0 4px 0px oklch(0.35 0.14 196), 0 8px 24px oklch(0.48 0.17 196 / 0.3)',
          }}
        >
          <span className="text-xl">🐕</span>
          Start a Walk — GPS Tracking
          <span className="text-lg opacity-70">→</span>
        </a>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-stone-400 font-medium">or log manually</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* ── Log a Walk form ── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Log a Walk</h2>

          <AnimatePresence mode="wait">
            {successToken ? (
              /* Success state */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={EASE_OUT}
                className="rounded-2xl p-6 text-center"
                style={CLAY_CARD}
              >
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="font-display text-xl text-stone-900 mb-1">Walk logged!</h3>
                <p className="text-sm text-stone-400 mb-5">Share this link with the pet parent.</p>

                {/* Link display */}
                <div
                  className="rounded-xl px-4 py-3 mb-4 text-xs text-stone-500 break-all font-mono text-left"
                  style={{ background: 'oklch(0.975 0.006 85)' }}
                >
                  {shareUrl(successToken)}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSuccessCopy}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                    style={successCopied ? { background: '#F0FDF4', color: '#15803D' } : TEAL_BUTTON}
                  >
                    {successCopied ? '✓ Copied!' : '🔗 Copy link'}
                  </button>
                  <a
                    href={`/walk-report/${successToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-center border border-border text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    View report →
                  </a>
                </div>

                <button
                  onClick={resetForm}
                  className="mt-4 text-xs text-stone-400 underline underline-offset-2"
                >
                  Log another walk
                </button>
              </motion.div>
            ) : (
              /* Form */
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={EASE_OUT}
                onSubmit={handleSubmit}
                className="rounded-2xl overflow-hidden"
                style={CLAY_CARD}
              >
                <div className="p-5 space-y-5">

                  {/* Dog name */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      Dog&apos;s name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={dogName}
                      onChange={e => setDogName(e.target.value)}
                      placeholder="e.g. Bruno"
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm text-stone-900 placeholder:text-stone-300 border border-stone-200 focus:outline-none focus:border-teal-400 transition-colors bg-white"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-2">
                      Duration
                    </label>
                    <DurationStepper value={duration} onChange={setDuration} />
                  </div>

                  {/* Activity counters */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-3">
                      Activity
                    </label>
                    <div className="flex gap-4">
                      <ActivityCounter
                        emoji="💩"
                        label="Poop"
                        count={poopCount}
                        onChange={setPoopCount}
                      />
                      <ActivityCounter
                        emoji="💧"
                        label="Pee"
                        count={peeCount}
                        onChange={setPeeCount}
                      />
                    </div>
                  </div>

                  {/* Route */}
                  <div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Route</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-white">
                          <span className="text-sm">📍</span>
                          <input
                            type="text"
                            placeholder="Started from..."
                            value={startLocation}
                            onChange={e => setStartLocation(e.target.value)}
                            className="flex-1 text-sm outline-none bg-transparent"
                          />
                        </div>
                      </div>
                      <span className="text-stone-300 font-bold">→</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-white">
                          <span className="text-sm">🏁</span>
                          <input
                            type="text"
                            placeholder="Ended at..."
                            value={endLocation}
                            onChange={e => setEndLocation(e.target.value)}
                            className="flex-1 text-sm outline-none bg-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Photo */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-2">
                      Photo <span className="text-stone-300 font-normal">(optional)</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />

                    {photoPreview ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                        <img
                          src={photoPreview}
                          alt="Walk photo preview"
                          className="w-full h-full object-cover"
                        />
                        {uploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">Uploading…</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoPreview(null)
                            setPhotoUrl(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white text-sm flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center gap-2 text-stone-400 text-sm font-medium hover:border-teal-300 hover:text-teal-600 transition-colors"
                      >
                        <span className="text-xl">📸</span>
                        Take or choose a photo
                      </button>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      Notes <span className="text-stone-300 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Anything the pet parent should know…"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl text-sm text-stone-900 placeholder:text-stone-300 border border-stone-200 focus:outline-none focus:border-teal-400 transition-colors bg-white resize-none"
                    />
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-500 text-center">{submitError}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !dogName.trim()}
                  className="flex items-center justify-center gap-2 w-full py-4 text-sm font-bold transition-all disabled:opacity-50"
                  style={TEAL_BUTTON}
                >
                  {submitting ? 'Saving…' : '✓ Log this walk'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </section>

        {/* ── Past Reports ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">Past Reports</h2>
            {reports.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                {reports.length}
              </span>
            )}
          </div>

          {reports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={EASE_OUT}
              className="rounded-2xl p-10 text-center"
              style={CLAY_CARD}
            >
              <div className="text-5xl mb-4">🐾</div>
              <h3 className="text-base font-bold text-stone-900 mb-2">No reports yet</h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                Log your first walk above — the pet parent gets a shareable summary.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {reports.map(report => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
