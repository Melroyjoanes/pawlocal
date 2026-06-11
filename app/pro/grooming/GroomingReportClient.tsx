'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import DogBodyMap, { TICK_ZONES, type TickZoneId } from '@/components/DogBodyMap'

// ─── Constants ───────────────────────────────────────────────────────────────

const GROOMING_SERVICES = [
  { id: 'bath',         label: 'Bath',             emoji: '🛁' },
  { id: 'blow_dry',     label: 'Blow Dry',         emoji: '💨' },
  { id: 'haircut',      label: 'Haircut',          emoji: '✂️' },
  { id: 'nail_clip',    label: 'Nail Clip',        emoji: '💅' },
  { id: 'ear_clean',    label: 'Ear Cleaning',     emoji: '🧹' },
  { id: 'teeth_brush',  label: 'Teeth',            emoji: '🦷' },
  { id: 'deshed',       label: 'De-shedding',      emoji: '🌀' },
  { id: 'tick_shampoo', label: 'Anti-tick Shampoo',emoji: '🕷️' },
  { id: 'paw_trim',     label: 'Paw Trim',         emoji: '🐾' },
  { id: 'cologne',      label: 'Cologne',          emoji: '✨' },
] as const

type ConditionOption = { value: string; label: string; color: string }

const SKIN_OPTIONS: ConditionOption[] = [
  { value: 'normal',   label: 'Normal',    color: '#10B981' },
  { value: 'dry',      label: 'Dry',       color: '#F59E0B' },
  { value: 'rash',     label: 'Rash',      color: '#EF4444' },
  { value: 'hot_spot', label: 'Hot Spot',  color: '#EF4444' },
]
const EAR_OPTIONS: ConditionOption[] = [
  { value: 'clean',           label: 'Clean',         color: '#10B981' },
  { value: 'waxy',            label: 'Waxy',          color: '#F59E0B' },
  { value: 'mites_suspected', label: 'Mites?',        color: '#EF4444' },
]
const NAIL_OPTIONS: ConditionOption[] = [
  { value: 'healthy',  label: 'Healthy',   color: '#10B981' },
  { value: 'overgrown',label: 'Overgrown', color: '#F59E0B' },
  { value: 'broken',   label: 'Broken',    color: '#EF4444' },
]
const COAT_OPTIONS: ConditionOption[] = [
  { value: 'shiny',             label: 'Shiny',           color: '#10B981' },
  { value: 'matted',            label: 'Matted',          color: '#F59E0B' },
  { value: 'excessive_shedding',label: 'Heavy Shedding',  color: '#F59E0B' },
]
const BEHAVIOR_OPTIONS: ConditionOption[] = [
  { value: 'calm',            label: 'Calm',           color: '#10B981' },
  { value: 'anxious',         label: 'A bit anxious',  color: '#F59E0B' },
  { value: 'needed_patience', label: 'Needed patience',color: '#6366F1' },
]

type GroomingReport = {
  id: string
  token: string
  dog_name: string
  grooming_date: string
  duration_mins: number
  services_done: string[]
  ticks_found: number
  tick_locations: string[]
  skin_condition: string
  ear_condition: string
  nail_condition: string
  coat_condition: string
  behavior: string
  before_photo_url: string | null
  after_photo_url: string | null
  notes: string | null
  recommendations: string | null
  created_at: string
}

type Props = {
  initialReports: GroomingReport[]
  providerId: string
  providerName: string
  hideHeader?: boolean
}

const EASE_OUT = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } as const

const CLAY_CARD: React.CSSProperties = {
  background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
  border: '1px solid rgba(226,220,200,0.7)',
}

const TEAL_BTN: React.CSSProperties = {
  background: 'linear-gradient(160deg, oklch(0.52 0.17 196) 0%, oklch(0.44 0.16 196) 100%)',
  color: '#fff',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

function shareUrl(token: string) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/grooming-report/${token}`
}

// ─── ConditionPicker ─────────────────────────────────────────────────────────

function ConditionPicker({
  label, options, value, onChange,
}: { label: string; options: ConditionOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all active:scale-95"
            style={value === o.value
              ? { background: o.color, borderColor: o.color, color: '#fff' }
              : { background: 'white', borderColor: 'rgba(226,220,200,0.7)', color: '#78716C' }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── DurationStepper ─────────────────────────────────────────────────────────

function DurationStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => onChange(Math.max(15, value - 15))} disabled={value <= 15}
        className="w-11 h-11 rounded-xl bg-stone-100 text-stone-500 font-bold text-xl flex items-center justify-center transition-colors disabled:opacity-30 active:scale-95">
        −
      </button>
      <div className="flex-1 text-center">
        <span className="text-3xl font-bold text-stone-900">{value}</span>
        <span className="text-sm text-stone-400 ml-1">min</span>
      </div>
      <button type="button" onClick={() => onChange(Math.min(360, value + 15))} disabled={value >= 360}
        className="w-11 h-11 rounded-xl font-bold text-xl flex items-center justify-center text-white transition-colors disabled:opacity-30 active:scale-95"
        style={{ background: 'oklch(0.48 0.17 196)' }}>
        +
      </button>
    </div>
  )
}

// ─── Past Report Card ─────────────────────────────────────────────────────────

function ReportCard({ report, onDelete }: { report: GroomingReport; onDelete: (id: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleCopy() {
    const url = shareUrl(report.token)
    try { await navigator.clipboard.writeText(url) }
    catch {
      const el = document.createElement('textarea')
      el.value = url; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true); onDelete(report.id)
    try { await fetch(`/api/grooming-reports/${report.token}`, { method: 'DELETE' }) }
    catch { /* optimistic — already removed */ }
  }

  const hasTicks = report.ticks_found > 0
  const tickZones = (report.tick_locations as TickZoneId[]).filter(Boolean)

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }} transition={EASE_OUT}
      className="rounded-2xl overflow-hidden" style={CLAY_CARD}>

      <div className="flex gap-3 p-4">
        {/* After photo */}
        {report.after_photo_url ? (
          <img src={report.after_photo_url} alt={report.dog_name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
            style={{ background: 'oklch(0.48 0.17 196 / 0.08)' }}>✂️</div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base text-stone-900 leading-tight truncate">
              {report.dog_name}
            </h3>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors text-sm font-bold"
              aria-label="Delete">✕</button>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">{formatDate(report.grooming_date)}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-stone-500">
            <span>⏱ {report.duration_mins} min</span>
            {hasTicks && <span className="text-orange-600 font-semibold">🕷️ {report.ticks_found} tick{report.ticks_found !== 1 ? 's' : ''}</span>}
            {report.services_done.length > 0 && <span>{report.services_done.length} services</span>}
          </div>
          {/* Health flags */}
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {report.skin_condition !== 'normal' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold">
                Skin: {report.skin_condition.replace('_', ' ')}
              </span>
            )}
            {report.ear_condition !== 'clean' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">
                Ear: {report.ear_condition.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tick heat-map preview */}
      {hasTicks && tickZones.length > 0 && (
        <div className="px-4 pb-3">
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-2 text-xs font-semibold text-orange-600 mb-2">
            <span>🕷️ Tick map</span>
            <span className="text-stone-300">{expanded ? '▲' : '▼'}</span>
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div key="map" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                className="overflow-hidden">
                <div className="flex gap-4 items-start">
                  <DogBodyMap selected={tickZones} mode="view" size={120} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-stone-400 mb-1.5">Found on:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tickZones.map(z => {
                        const zone = TICK_ZONES.find(t => t.id === z)
                        return (
                          <span key={z} className="text-xs px-2 py-1 rounded-full font-semibold"
                            style={{ background: 'rgba(240,112,48,0.12)', color: '#C44010' }}>
                            🕷️ {zone?.label ?? z}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Share button */}
      <button onClick={handleCopy}
        className="flex items-center justify-center gap-2 w-full py-3 text-xs font-bold transition-all border-t"
        style={{
          borderColor: 'rgba(226,220,200,0.7)',
          color: copied ? '#15803D' : 'oklch(0.44 0.16 196)',
          background: copied ? '#F0FDF4' : 'transparent',
        }}>
        {copied ? '✓ Copied!' : '🔗 Copy shareable link'}
      </button>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GroomingReportClient({ initialReports, providerId, providerName, hideHeader = false }: Props) {
  const [reports, setReports] = useState<GroomingReport[]>(initialReports)

  // Form state
  const [dogName, setDogName] = useState('')
  const [duration, setDuration] = useState(60)
  const [servicesDone, setServicesDone] = useState<string[]>([])
  const [ticksFound, setTicksFound] = useState(0)
  const [tickLocations, setTickLocations] = useState<TickZoneId[]>([])
  const [skinCondition, setSkinCondition] = useState('normal')
  const [earCondition, setEarCondition] = useState('clean')
  const [nailCondition, setNailCondition] = useState('healthy')
  const [coatCondition, setCoatCondition] = useState('shiny')
  const [behavior, setBehavior] = useState('calm')
  const [beforePhotoUrl, setBeforePhotoUrl] = useState<string | null>(null)
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | null>(null)
  const [beforePreview, setBeforePreview] = useState<string | null>(null)
  const [afterPreview, setAfterPreview] = useState<string | null>(null)
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [uploadingAfter, setUploadingAfter] = useState(false)
  const [notes, setNotes] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successToken, setSuccessToken] = useState<string | null>(null)
  const [successCopied, setSuccessCopied] = useState(false)

  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function resetForm() {
    setDogName(''); setDuration(60); setServicesDone([]); setTicksFound(0)
    setTickLocations([]); setSkinCondition('normal'); setEarCondition('clean')
    setNailCondition('healthy'); setCoatCondition('shiny'); setBehavior('calm')
    setBeforePhotoUrl(null); setAfterPhotoUrl(null)
    setBeforePreview(null); setAfterPreview(null)
    setNotes(''); setRecommendations('')
    setSuccessToken(null); setSuccessCopied(false); setSubmitError(null)
  }

  function toggleService(id: string) {
    setServicesDone(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    )
  }

  async function uploadPhoto(
    file: File,
    setPreview: (url: string) => void,
    setUrl: (url: string | null) => void,
    setUploading: (b: boolean) => void,
    prefix: string,
  ) {
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const path = `${providerId}/${prefix}-${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('walk-report-photos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('walk-report-photos').getPublicUrl(path)
      setUrl(data.publicUrl)
    } catch {
      setUrl(null)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dogName.trim()) return
    setSubmitting(true); setSubmitError(null)

    try {
      const res = await fetch('/api/grooming-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dog_name: dogName,
          grooming_date: new Date().toISOString(),
          duration_mins: duration,
          services_done: servicesDone,
          ticks_found: ticksFound,
          tick_locations: tickLocations,
          skin_condition: skinCondition,
          ear_condition: earCondition,
          nail_condition: nailCondition,
          coat_condition: coatCondition,
          behavior,
          before_photo_url: beforePhotoUrl,
          after_photo_url: afterPhotoUrl,
          notes: notes.trim() || null,
          recommendations: recommendations.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')

      setReports(prev => [{
        id: json.id, token: json.token,
        dog_name: dogName, grooming_date: new Date().toISOString(),
        duration_mins: duration, services_done: servicesDone,
        ticks_found: ticksFound, tick_locations: tickLocations,
        skin_condition: skinCondition, ear_condition: earCondition,
        nail_condition: nailCondition, coat_condition: coatCondition,
        behavior, before_photo_url: beforePhotoUrl,
        after_photo_url: afterPhotoUrl, notes: notes.trim() || null,
        recommendations: recommendations.trim() || null,
        created_at: new Date().toISOString(),
      }, ...prev])
      setSuccessToken(json.token)

      // Pre-warm OG image with params (no DB query on WhatsApp scrape)
      const warmParams = new URLSearchParams({
        dog: dogName, groomer: providerName,
        services: String(servicesDone.length),
      })
      if (ticksFound > 0) warmParams.set('ticks', String(ticksFound))
      fetch(`/api/og/grooming-report/${json.token}?${warmParams}`).catch(() => {})
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSuccessCopy() {
    if (!successToken) return
    const url = shareUrl(successToken)
    try { await navigator.clipboard.writeText(url) }
    catch {
      const el = document.createElement('textarea')
      el.value = url; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setSuccessCopied(true); setTimeout(() => setSuccessCopied(false), 2000)
  }

  return (
    <div className="min-h-dvh pb-28" style={{ background: 'oklch(0.975 0.006 85)' }}>

      {!hideHeader && (
        <header className="sticky top-0 z-40 bg-white border-b border-border">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="font-display text-xl text-stone-900">Grooming Reports</h1>
            <span className="text-xs text-stone-400 font-medium truncate max-w-[140px]">{providerName}</span>
          </div>
        </header>
      )}

      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* ── Log a Grooming Form ── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Log a Grooming Session</h2>

          <AnimatePresence mode="wait">
            {successToken ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }} transition={EASE_OUT}
                className="rounded-2xl p-6 text-center" style={CLAY_CARD}>
                <div className="text-5xl mb-3">✂️</div>
                <h3 className="font-display text-xl text-stone-900 mb-1">Grooming logged!</h3>
                <p className="text-sm text-stone-400 mb-5">Share this link with the pet parent.</p>
                <div className="rounded-xl px-4 py-3 mb-4 text-xs text-stone-500 break-all font-mono text-left"
                  style={{ background: 'oklch(0.975 0.006 85)' }}>
                  {shareUrl(successToken)}
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSuccessCopy}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                    style={successCopied ? { background: '#F0FDF4', color: '#15803D' } : TEAL_BTN}>
                    {successCopied ? '✓ Copied!' : '🔗 Copy link'}
                  </button>
                  <a href={`/grooming-report/${successToken}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-center border border-border text-stone-700 hover:bg-stone-50 transition-colors">
                    View report →
                  </a>
                </div>
                <button onClick={resetForm} className="mt-4 text-xs text-stone-400 underline underline-offset-2">
                  Log another session
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={EASE_OUT}
                onSubmit={handleSubmit} className="rounded-2xl overflow-hidden" style={CLAY_CARD}>
                <div className="p-5 space-y-6">

                  {/* Dog name */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      Dog&apos;s name <span className="text-red-400">*</span>
                    </label>
                    <input type="text" value={dogName} onChange={e => setDogName(e.target.value)}
                      placeholder="e.g. Bruno" required
                      className="w-full px-4 py-3 rounded-xl text-sm text-stone-900 placeholder:text-stone-300 border border-stone-200 focus:outline-none focus:border-teal-400 transition-colors bg-white" />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-2">Session Duration</label>
                    <DurationStepper value={duration} onChange={setDuration} />
                  </div>

                  {/* Services */}
                  <div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                      Services Done
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {GROOMING_SERVICES.map(s => {
                        const active = servicesDone.includes(s.id)
                        return (
                          <button key={s.id} type="button" onClick={() => toggleService(s.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95"
                            style={active
                              ? { background: 'oklch(0.48 0.17 196)', borderColor: 'oklch(0.48 0.17 196)', color: 'white' }
                              : { background: 'white', borderColor: 'rgba(226,220,200,0.7)', color: '#78716C' }
                            }>
                            <span>{s.emoji}</span>{s.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── Ticks section ── */}
                  <div className="rounded-2xl p-4 space-y-4"
                    style={{ background: ticksFound > 0 ? 'rgba(240,112,48,0.06)' : 'oklch(0.975 0.006 85)', border: ticksFound > 0 ? '1.5px solid rgba(240,112,48,0.2)' : '1.5px solid rgba(226,220,200,0.5)' }}>
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                        🕷️ Ticks Found
                      </p>
                      <div className="flex items-center gap-4">
                        <button type="button" onClick={() => { setTicksFound(Math.max(0, ticksFound - 1)); if (ticksFound <= 1) setTickLocations([]) }}
                          className="w-11 h-11 rounded-xl bg-white text-stone-500 font-bold text-xl flex items-center justify-center border border-stone-200 active:scale-95 disabled:opacity-30"
                          disabled={ticksFound === 0}>−</button>
                        <div className="flex-1 text-center">
                          <span className={`text-3xl font-bold ${ticksFound > 0 ? 'text-orange-600' : 'text-stone-900'}`}>{ticksFound}</span>
                          <span className="text-sm text-stone-400 ml-1">ticks</span>
                        </div>
                        <button type="button" onClick={() => setTicksFound(t => t + 1)}
                          className="w-11 h-11 rounded-xl font-bold text-xl flex items-center justify-center text-white border-0 active:scale-95"
                          style={{ background: '#F07030' }}>+</button>
                      </div>
                    </div>

                    {/* Tick heat-map — shown when ticks > 0 */}
                    <AnimatePresence>
                      {ticksFound > 0 && (
                        <motion.div key="heatmap" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                            Where were they? <span className="text-stone-300 font-normal normal-case">(tap to mark)</span>
                          </p>
                          <div className="flex gap-4 items-start">
                            <DogBodyMap selected={tickLocations} onChange={setTickLocations} mode="edit" size={160} />
                            <div className="flex-1">
                              {tickLocations.length === 0 ? (
                                <p className="text-xs text-stone-400 mt-4">Tap the body zones on the left to mark where ticks were found.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-stone-400 mb-2">Marked zones:</p>
                                  {tickLocations.map(z => {
                                    const zone = TICK_ZONES.find(t => t.id === z)
                                    return (
                                      <button key={z} type="button"
                                        onClick={() => setTickLocations(prev => prev.filter(l => l !== z))}
                                        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left active:scale-95"
                                        style={{ background: 'rgba(240,112,48,0.12)', color: '#C44010' }}>
                                        <span>🕷️</span>
                                        <span className="flex-1">{zone?.label ?? z}</span>
                                        <span className="text-stone-300 text-xs">✕</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Health findings */}
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Health Findings</p>
                    <ConditionPicker label="Skin" options={SKIN_OPTIONS} value={skinCondition} onChange={setSkinCondition} />
                    <ConditionPicker label="Ears" options={EAR_OPTIONS} value={earCondition} onChange={setEarCondition} />
                    <ConditionPicker label="Nails" options={NAIL_OPTIONS} value={nailCondition} onChange={setNailCondition} />
                    <ConditionPicker label="Coat" options={COAT_OPTIONS} value={coatCondition} onChange={setCoatCondition} />
                  </div>

                  {/* Behavior */}
                  <ConditionPicker label="Behavior During Session" options={BEHAVIOR_OPTIONS} value={behavior} onChange={setBehavior} />

                  {/* Before photo */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-2">
                      Before Photo <span className="text-stone-300 font-normal">(optional)</span>
                    </label>
                    <input ref={beforeInputRef} type="file" accept="image/*" capture="environment"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, setBeforePreview, setBeforePhotoUrl, setUploadingBefore, 'before') }}
                      className="hidden" />
                    {beforePreview ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                        <img src={beforePreview} alt="Before" className="w-full h-full object-cover" />
                        {uploadingBefore && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">Uploading…</span>
                          </div>
                        )}
                        <button type="button" onClick={() => { setBeforePreview(null); setBeforePhotoUrl(null); if (beforeInputRef.current) beforeInputRef.current.value = '' }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white text-sm flex items-center justify-center">✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => beforeInputRef.current?.click()}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center gap-2 text-stone-400 text-sm font-medium hover:border-teal-300 hover:text-teal-600 transition-colors">
                        <span className="text-xl">📸</span> Before photo
                      </button>
                    )}
                  </div>

                  {/* After photo */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-2">
                      After Photo <span className="text-stone-300 font-normal">(the wow moment!)</span>
                    </label>
                    <input ref={afterInputRef} type="file" accept="image/*" capture="environment"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, setAfterPreview, setAfterPhotoUrl, setUploadingAfter, 'after') }}
                      className="hidden" />
                    {afterPreview ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                        <img src={afterPreview} alt="After" className="w-full h-full object-cover" />
                        {uploadingAfter && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">Uploading…</span>
                          </div>
                        )}
                        <button type="button" onClick={() => { setAfterPreview(null); setAfterPhotoUrl(null); if (afterInputRef.current) afterInputRef.current.value = '' }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white text-sm flex items-center justify-center">✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => afterInputRef.current?.click()}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-amber-200 flex items-center justify-center gap-2 text-amber-500 text-sm font-medium hover:border-amber-400 transition-colors">
                        <span className="text-xl">✨</span> After photo — share the transformation!
                      </button>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      Notes <span className="text-stone-300 font-normal">(optional)</span>
                    </label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Anything the pet parent should know…" rows={2}
                      className="w-full px-4 py-3 rounded-xl text-sm text-stone-900 placeholder:text-stone-300 border border-stone-200 focus:outline-none focus:border-teal-400 transition-colors bg-white resize-none" />
                  </div>

                  {/* Recommendations */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                      Recommendation <span className="text-stone-300 font-normal">(optional)</span>
                    </label>
                    <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)}
                      placeholder="e.g. Next groom in 4 weeks. Suggest vet check for the ear." rows={2}
                      className="w-full px-4 py-3 rounded-xl text-sm text-stone-900 placeholder:text-stone-300 border border-stone-200 focus:outline-none focus:border-teal-400 transition-colors bg-white resize-none" />
                  </div>

                  {submitError && <p className="text-xs text-red-500 text-center">{submitError}</p>}
                </div>

                <button type="submit" disabled={submitting || !dogName.trim()}
                  className="flex items-center justify-center gap-2 w-full py-4 text-sm font-bold transition-all disabled:opacity-50"
                  style={TEAL_BTN}>
                  {submitting ? 'Saving…' : '✓ Save grooming report'}
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
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={EASE_OUT}
              className="rounded-2xl p-10 text-center" style={CLAY_CARD}>
              <div className="text-5xl mb-4">✂️</div>
              <h3 className="text-base font-bold text-stone-900 mb-2">No grooming reports yet</h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                Log a session above — the pet parent gets a full report with health findings.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {reports.map(r => (
                  <ReportCard key={r.id} report={r} onDelete={id => setReports(prev => prev.filter(r => r.id !== id))} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
