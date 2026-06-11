'use client'

import { useState } from 'react'
import DogBodyMap, { TICK_ZONES, type TickZoneId } from '@/components/DogBodyMap'

const GROOMING_SERVICE_LABELS: Record<string, string> = {
  bath:         '🛁 Bath',
  blow_dry:     '💨 Blow Dry',
  haircut:      '✂️ Haircut',
  nail_clip:    '💅 Nail Clip',
  ear_clean:    '🧹 Ear Cleaning',
  teeth_brush:  '🦷 Teeth',
  deshed:       '🌀 De-shedding',
  tick_shampoo: '🕷️ Anti-tick Shampoo',
  paw_trim:     '🐾 Paw Trim',
  cologne:      '✨ Cologne',
}

type ConditionBadgeProps = { label: string; value: string; normal: string; color: string }

function ConditionBadge({ label, value, normal, color }: ConditionBadgeProps) {
  const isNormal = value === normal
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">{label}</p>
      <span className="text-xs font-bold px-2.5 py-1.5 rounded-full inline-block self-start"
        style={isNormal
          ? { background: '#F0FDF4', color: '#15803D' }
          : { background: color + '20', color }
        }>
        {value.replace(/_/g, ' ')}
      </span>
    </div>
  )
}

type Report = {
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
  provider_name: string
  is_verified: boolean
}

export default function GroomingReportCard({ report }: { report: Report }) {
  const [copied, setCopied] = useState(false)
  const [showBefore, setShowBefore] = useState(false)
  const tickZones = (report.tick_locations as TickZoneId[]).filter(Boolean)

  async function handleCopy() {
    const url = window.location.href
    try { await navigator.clipboard.writeText(url) }
    catch {
      const el = document.createElement('textarea')
      el.value = url; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const groomDate = new Date(report.grooming_date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const hasHealthAlerts = (
    report.skin_condition !== 'normal' ||
    report.ear_condition !== 'clean' ||
    report.nail_condition !== 'healthy' ||
    report.coat_condition !== 'shiny'
  )

  return (
    <div className="min-h-dvh pb-12" style={{ background: 'oklch(0.975 0.006 85)' }}>

      {/* ── Before/After Hero ── */}
      {(report.before_photo_url || report.after_photo_url) && (
        <div className="relative bg-stone-900">
          {report.after_photo_url ? (
            <img
              src={showBefore && report.before_photo_url ? report.before_photo_url : report.after_photo_url}
              alt={showBefore ? `${report.dog_name} before grooming` : `${report.dog_name} after grooming`}
              className="w-full object-cover"
              style={{ maxHeight: 360 }}
            />
          ) : report.before_photo_url && (
            <img src={report.before_photo_url} alt={`${report.dog_name} before grooming`}
              className="w-full object-cover" style={{ maxHeight: 360 }} />
          )}

          {/* Toggle */}
          {report.before_photo_url && report.after_photo_url && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex rounded-full overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
              <button onClick={() => setShowBefore(true)}
                className="px-4 py-1.5 text-xs font-bold transition-all"
                style={showBefore ? { background: 'white', color: '#1C1917' } : { color: 'rgba(255,255,255,0.7)' }}>
                Before
              </button>
              <button onClick={() => setShowBefore(false)}
                className="px-4 py-1.5 text-xs font-bold transition-all"
                style={!showBefore ? { background: 'white', color: '#1C1917' } : { color: 'rgba(255,255,255,0.7)' }}>
                After
              </button>
            </div>
          )}

          {/* Overlay badge */}
          {!showBefore && report.after_photo_url && (
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'oklch(0.48 0.17 196)', color: 'white' }}>
              ✨ Fresh groomed!
            </div>
          )}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* ── Name + Provider ── */}
        <div>
          <h1 className="font-display text-3xl text-stone-900 leading-tight">
            {report.dog_name}&apos;s Grooming Report
          </h1>
          <p className="text-sm text-stone-400 mt-1">{groomDate}</p>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'oklch(0.48 0.17 196 / 0.1)', color: 'oklch(0.44 0.16 196)' }}>
              <span>✂️</span>
              <span>{report.provider_name}</span>
              {report.is_verified && <span>✓</span>}
            </div>
            <span className="text-xs text-stone-400">⏱ {report.duration_mins} min</span>
          </div>
        </div>

        {/* ── Services Done ── */}
        {report.services_done.length > 0 && (
          <div className="rounded-2xl p-4" style={{
            background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
            border: '1px solid rgba(226,220,200,0.7)',
          }}>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
              Services Done
            </p>
            <div className="flex flex-wrap gap-2">
              {report.services_done.map(s => (
                <span key={s} className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: 'oklch(0.48 0.17 196 / 0.1)', color: 'oklch(0.40 0.15 196)' }}>
                  {GROOMING_SERVICE_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Tick Section ── */}
        {report.ticks_found > 0 && (
          <div className="rounded-2xl p-4 space-y-4"
            style={{
              background: 'rgba(240,112,48,0.05)',
              border: '1.5px solid rgba(240,112,48,0.2)',
              boxShadow: '0 6px 20px rgba(240,112,48,0.08)',
            }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(240,112,48,0.12)' }}>🕷️</div>
              <div>
                <p className="font-bold text-stone-900">
                  {report.ticks_found} tick{report.ticks_found !== 1 ? 's' : ''} removed
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Anti-tick shampoo{report.services_done.includes('tick_shampoo') ? ' used ✓' : ' recommended'}
                </p>
              </div>
            </div>

            {tickZones.length > 0 && (
              <>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Where they were found:
                </p>
                <div className="flex gap-4 items-start">
                  <DogBodyMap selected={tickZones} mode="view" size={150} />
                  <div className="flex-1 space-y-1.5">
                    {tickZones.map(z => {
                      const zone = TICK_ZONES.find(t => t.id === z)
                      return (
                        <div key={z} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: 'rgba(240,112,48,0.12)', color: '#C44010' }}>
                          <span>🕷️</span>
                          <span>{zone?.label ?? z}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Health Findings ── */}
        <div className="rounded-2xl p-4" style={{
          background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
          boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
          border: '1px solid rgba(226,220,200,0.7)',
        }}>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">Health Findings</p>
          <div className="grid grid-cols-2 gap-4">
            <ConditionBadge label="Skin" value={report.skin_condition} normal="normal" color="#EF4444" />
            <ConditionBadge label="Ears" value={report.ear_condition} normal="clean" color="#F59E0B" />
            <ConditionBadge label="Nails" value={report.nail_condition} normal="healthy" color="#F59E0B" />
            <ConditionBadge label="Coat" value={report.coat_condition} normal="shiny" color="#F59E0B" />
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100">
            <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-2">Behavior</p>
            <span className="text-xs px-2.5 py-1.5 rounded-full font-bold inline-block"
              style={{ background: '#F0FDF4', color: '#15803D' }}>
              {report.behavior.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* ── Alert Banner ── */}
        {hasHealthAlerts && (
          <div className="rounded-2xl p-4 flex gap-3"
            style={{ background: '#FFFBEB', border: '1.5px solid rgba(245,158,11,0.3)' }}>
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Heads up from your groomer</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Some health findings during this session. A vet visit might be worth it.
              </p>
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        {report.notes && (
          <div className="rounded-2xl p-4" style={{
            background: 'linear-gradient(160deg, #ffffff 0%, #fffdf7 100%)',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(0,0,0,0.05), 0 6px 20px rgba(15,45,50,0.07)',
            border: '1px solid rgba(226,220,200,0.7)',
          }}>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Notes</p>
            <p className="text-sm text-stone-700 leading-relaxed">{report.notes}</p>
          </div>
        )}

        {/* ── Recommendations ── */}
        {report.recommendations && (
          <div className="rounded-2xl p-4" style={{
            background: 'oklch(0.48 0.17 196 / 0.06)',
            border: '1.5px solid oklch(0.48 0.17 196 / 0.18)',
          }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: 'oklch(0.44 0.16 196)' }}>
              Groomer Recommends
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.35 0.14 196)' }}>
              {report.recommendations}
            </p>
          </div>
        )}

        {/* ── Share ── */}
        <button onClick={handleCopy}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold transition-all"
          style={copied
            ? { background: '#F0FDF4', color: '#15803D', border: '1.5px solid #BBF7D0' }
            : { background: 'white', color: 'oklch(0.44 0.16 196)', border: '1.5px solid rgba(226,220,200,0.7)', boxShadow: '0 6px 20px rgba(15,45,50,0.07)' }
          }>
          {copied ? '✓ Link copied!' : '🔗 Share this report'}
        </button>

        {/* ── Footer ── */}
        <div className="text-center pt-4 pb-8">
          <a href="https://pupstep.in" className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
            Powered by PupStep
          </a>
        </div>
      </div>
    </div>
  )
}
