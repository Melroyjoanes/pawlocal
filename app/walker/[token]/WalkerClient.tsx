'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Live map shown to walker during walk ──────────────────────────────────────
function LiveMap({
  currentPos,
  routePointsRef,
  poopEvents,
  peeEvents,
}: {
  currentPos: { lat: number; lng: number } | null
  routePointsRef: React.RefObject<{ lat: number; lng: number }[]>
  poopEvents: { lat: number; lng: number; ts: string }[]
  peeEvents: { lat: number; lng: number; ts: string }[]
}) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const posMarkerRef = useRef<google.maps.Marker | null>(null)
  const eventMarkersRef = useRef<google.maps.Marker[]>([])

  useEffect(() => {
    function initMap() {
      if (!mapDivRef.current) return
      const center = currentPos ?? { lat: 19.098, lng: 72.827 } // Juhu, Mumbai default
      const gm = (window as { google?: { maps: typeof google.maps } }).google!.maps

      const map = new gm.Map(mapDivRef.current, {
        center,
        zoom: 17,
        disableDefaultUI: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      })
      mapRef.current = map

      polylineRef.current = new gm.Polyline({
        geodesic: true,
        strokeColor: '#0f766e',
        strokeOpacity: 1,
        strokeWeight: 5,
        map,
      })

      posMarkerRef.current = new gm.Marker({
        position: center,
        map,
        zIndex: 10,
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#0f766e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      })
    }

    if ((window as { google?: { maps: typeof google.maps } }).google?.maps) {
      initMap()
    } else {
      const existing = document.getElementById('gmaps-script')
      if (!existing) {
        const script = document.createElement('script')
        script.id = 'gmaps-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        script.async = true
        script.onload = initMap
        document.head.appendChild(script)
      } else {
        existing.addEventListener('load', initMap)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pan + update route on every new GPS point
  useEffect(() => {
    if (!mapRef.current || !currentPos) return
    posMarkerRef.current?.setPosition(currentPos)
    polylineRef.current?.setPath(routePointsRef.current ?? [])
    mapRef.current.panTo(currentPos)
  }, [currentPos, routePointsRef])

  // Add poop/pee markers when events change
  useEffect(() => {
    if (!mapRef.current) return
    const gm = (window as { google?: { maps: typeof google.maps } }).google?.maps
    if (!gm) return

    // Clear old event markers
    eventMarkersRef.current.forEach(m => m.setMap(null))
    eventMarkersRef.current = []

    const allEvents = [
      ...poopEvents.map(e => ({ ...e, emoji: '💩' })),
      ...peeEvents.map(e => ({ ...e, emoji: '💧' })),
    ]

    allEvents.forEach(evt => {
      const marker = new gm.Marker({
        position: { lat: evt.lat, lng: evt.lng },
        map: mapRef.current!,
        label: { text: evt.emoji, fontSize: '16px' },
        icon: { path: gm.SymbolPath.CIRCLE, scale: 0 }, // invisible base, emoji label only
      })
      eventMarkersRef.current.push(marker)
    })
  }, [poopEvents, peeEvents])

  return (
    <div
      ref={mapDivRef}
      className="w-full h-full"
      style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
    />
  )
}

interface WalkerClientProps {
  token: string
  dogName: string
  dogBreed: string | null
  dogPhotoUrl: string | null
  healthNotes: string | null
  ownerFirstName: string
  walkerName: string
  walkerPhone: string | null
  walkerRole: string | null
  ownerPhone: string | null
  careFocus: string | null
}

interface ClientConnection {
  token: string
  dogId: string | null
  dogName: string
  dogBreed: string | null
  dogPhoto: string | null
  healthNotes: string | null
  careFocus: string
  ownerFirstName: string
  lastWalkDate: string | null
}

function relativeTime(iso: string): string {
  const d = new Date(iso), now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(diff / 86400000)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

const CARE_FOCUS_CONFIG: Record<string, { emoji: string; label: string; bg: string; border: string; color: string; walkerNote: string }> = {
  stomach: { emoji: '💩', label: 'Stomach monitoring', bg: '#FEF9C3', border: '#FDE047', color: '#854D0E', walkerNote: 'Poop photo is especially important today. Please photograph every time.' },
  recovery: { emoji: '🩹', label: 'Recovery mode', bg: '#FEE2E2', border: '#FECACA', color: '#991B1B', walkerNote: 'Gentle walk only. No running. Watch for limping or discomfort.' },
  anxiety: { emoji: '😰', label: 'Anxiety watch', bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', walkerNote: 'Stay calm. Avoid busy roads and loud areas. Short walk is fine.' },
  senior: { emoji: '🐕', label: 'Senior dog', bg: '#F3E8FF', border: '#E9D5FF', color: '#7C3AED', walkerNote: 'Easy pace. Rest often. Do not push distance today.' },
  puppy: { emoji: '🐶', label: 'Puppy', bg: '#F0FDF4', border: '#86EFAC', color: '#166534', walkerNote: 'Short walk. Lots of praise. Watch for tiredness.' },
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

interface GpsPoint {
  lat: number
  lng: number
  ts: string
  accuracy?: number // meters — stored for future route-quality auditing
}

interface WalkEvent {
  type: 'pee' | 'poop'
  lat: number | null
  lng: number | null
  ts: string
  photoUrl?: string | null
}

type WalkPhase = 'idle' | 'walking' | 'logging' | 'success'
type WalkerTab = 'walk' | 'settings'

const MOOD_OPTIONS = [
  { value: 'great', emoji: '😊', label: 'Great' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'issue', emoji: '😟', label: 'Had a problem' },
]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const ROLE_OPTIONS = [
  { value: 'dog_walker', label: 'Dog Walker' },
  { value: 'family_friend', label: 'Family Friend' },
  { value: 'professional', label: 'Professional' },
  { value: 'other', label: 'Other' },
]

function SettingsTab({
  token,
  walkerName,
  walkerPhone,
  walkerRole,
  dogName,
  dogBreed,
  dogPhotoUrl,
  healthNotes,
  ownerFirstName,
  ownerPhone,
  careFocus,
  showToast,
  addClientOtp,
  setAddClientOtp,
  addClientLoading,
  setAddClientLoading,
  addClientSuccess,
  setAddClientSuccess,
  addClientError,
  setAddClientError,
}: {
  token: string
  walkerName: string
  walkerPhone: string | null
  walkerRole: string | null
  dogName: string
  dogBreed: string | null
  dogPhotoUrl: string | null
  healthNotes: string | null
  ownerFirstName: string
  ownerPhone: string | null
  careFocus: string | null
  showToast: (msg: string) => void
  addClientOtp: string
  setAddClientOtp: (v: string) => void
  addClientLoading: boolean
  setAddClientLoading: (v: boolean) => void
  addClientSuccess: string | null
  setAddClientSuccess: (v: string | null) => void
  addClientError: string | null
  setAddClientError: (v: string | null) => void
}) {
  const [profileName, setProfileName] = useState(walkerName)
  const [profileRole, setProfileRole] = useState(walkerRole ?? '')
  const [saving, setSaving] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const dashUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/walker/${token}`
    : `https://pupstep.in/walker/${token}`

  async function handleSaveProfile() {
    if (!profileName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/walker/${token}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walker_name: profileName, walker_role: profileRole }),
      })
      if (res.ok) {
        showToast('Profile updated ✓')
      } else {
        showToast('Failed to save. Try again.')
      }
    } catch {
      showToast('Network error. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(dashUrl).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {
      showToast('Could not copy link')
    })
  }

  const sectionHead = (title: string) => (
    <p style={{
      fontFamily: 'var(--font-fredoka)',
      fontSize: 16,
      fontWeight: 700,
      color: '#0A2F35',
      margin: '0 0 14px',
    }}>{title}</p>
  )

  return (
    <div className="px-5 pt-2 pb-10 space-y-4">

      {/* ── Section 1: My Profile ── */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-5">
        {sectionHead('My Profile')}
        <div className="space-y-3">
          <div>
            <label style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
              Name
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2"
              style={{ fontFamily: 'var(--font-nunito)', outlineColor: 'oklch(0.48 0.17 196)' }}
            />
          </div>
          {walkerPhone && (
            <div>
              <label style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
                Phone
              </label>
              <div
                className="w-full rounded-xl border border-slate-100 px-3 py-3 text-sm bg-slate-50"
                style={{ fontFamily: 'var(--font-nunito)', color: '#64748B' }}
              >
                {walkerPhone}
              </div>
            </div>
          )}
          <div>
            <label style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
              Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfileRole(opt.value)}
                  className="py-2.5 px-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.97]"
                  style={{
                    fontFamily: 'var(--font-nunito)',
                    borderColor: profileRole === opt.value ? 'oklch(0.48 0.17 196)' : '#E2E8F0',
                    background: profileRole === opt.value ? 'oklch(0.95 0.04 196)' : '#fff',
                    color: profileRole === opt.value ? 'oklch(0.40 0.17 196)' : '#64748B',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full rounded-2xl font-bold text-white disabled:opacity-60 active:scale-[0.97] transition-transform"
            style={{
              background: 'oklch(0.48 0.17 196)',
              minHeight: 48,
              fontFamily: 'var(--font-fredoka)',
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* ── Section 2: Connected Dog ── */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-5">
        {sectionHead('Connected Dog')}
        {/* Dog identity row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden" style={{ background: '#FF8C52' }}>
            {dogPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dogPhotoUrl} alt={dogName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🐕</div>
            )}
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 18, fontWeight: 700, color: '#0A2F35', margin: 0 }}>
              {dogName}
            </p>
            {dogBreed && (
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: 0 }}>{dogBreed}</p>
            )}
          </div>
        </div>

        {/* Care focus badge */}
        {careFocus && careFocus !== 'normal' && CARE_FOCUS_CONFIG[careFocus] && (() => {
          const cfg = CARE_FOCUS_CONFIG[careFocus]
          return (
            <div style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 12, padding: '8px 12px', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>{cfg.emoji}</span>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
            </div>
          )
        })()}

        {/* Health notes */}
        {healthNotes && (
          <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '10px 12px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>{healthNotes}</p>
          </div>
        )}

        {/* Owner label */}
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: '0 0 10px' }}>
          Owner: <strong style={{ color: '#0A2F35' }}>{ownerFirstName}</strong>
        </p>

        {/* WhatsApp owner */}
        {ownerPhone && (
          <a
            href={`https://wa.me/91${ownerPhone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm active:scale-[0.97] transition-transform"
            style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', textDecoration: 'none' }}
          >
            💬 WhatsApp {ownerFirstName}
          </a>
        )}

        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#94A3B8', marginTop: 10, textAlign: 'center' }}>
          You cannot edit dog details. Ask the owner.
        </p>
      </div>

      {/* ── Section 3: Your Dashboard Link ── */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-5">
        {sectionHead('Your Dashboard Link')}
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.6 }}>
          Use this same link every time you walk {dogName}. Bookmark it or save to WhatsApp.
        </p>
        <div className="space-y-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`My PupStep dashboard for ${dogName} 🐾\nTap to log walks:\n${dashUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm active:scale-[0.97] transition-transform"
            style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', textDecoration: 'none' }}
          >
            📲 Save link on WhatsApp
          </a>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm active:scale-[0.97] transition-transform"
            style={{
              background: '#fff',
              border: '2px solid oklch(0.48 0.17 196)',
              color: 'oklch(0.48 0.17 196)',
              fontFamily: 'var(--font-fredoka)',
              cursor: 'pointer',
            }}
          >
            {linkCopied ? 'Copied! ✓' : 'Copy link'}
          </button>
        </div>
      </div>

      {/* ── Section 4: Walk Help ── */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-5">
        {sectionHead('Walk Help')}
        <div className="space-y-3">
          {[
            { icon: '🏃', boldWord: 'Start Walk', pre: 'Tap ', post: ` when you leave with ${dogName}` },
            { icon: '💧💩', boldWord: 'Toilet', pre: 'Tap ', post: ' or Potty buttons when it happens' },
            { icon: '📸', boldWord: null, pre: `Take a photo of ${dogName} after the walk`, post: '' },
            { icon: '✅', boldWord: 'Send report', pre: 'Tap ', post: ' — owner gets it on WhatsApp' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'oklch(0.48 0.17 196)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-fredoka)',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#0A2F35', margin: 0, lineHeight: 1.5 }}>
                {step.icon} {step.pre}{step.boldWord ? <strong>{step.boldWord}</strong> : null}{step.post}
              </p>
            </div>
          ))}
        </div>
        <a
          href="/walker-guide"
          style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: 'oklch(0.48 0.17 196)', display: 'block', textAlign: 'center', marginTop: 16 }}
        >
          Need GPS help? → View walker guide
        </a>
      </div>

      {/* ── Section 5: Support ── */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-5">
        {sectionHead('Support')}
        <div className="space-y-2">
          <a
            href="https://wa.me/919999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm active:scale-[0.97] transition-transform"
            style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', textDecoration: 'none' }}
          >
            💬 WhatsApp PupStep support
          </a>
          <a
            href={`https://wa.me/919999999999?text=${encodeURIComponent(`Problem with my PupStep dashboard [${token}]: `)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm active:scale-[0.97] transition-transform"
            style={{
              background: '#fff',
              border: '2px solid #E2E8F0',
              color: '#64748B',
              fontFamily: 'var(--font-fredoka)',
              textDecoration: 'none',
            }}
          >
            🚨 Report a problem
          </a>
        </div>
      </div>

      {/* ── Section 6: Add another client ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '16px' }}>
        <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: '#0A2F35', margin: '0 0 4px' }}>
          Add another client
        </p>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>
          Ask your new client to show you their 4-digit code
        </p>

        {addClientSuccess ? (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 15, fontWeight: 700, color: '#166534', margin: 0 }}>
              ✅ {addClientSuccess}
            </p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#166534', margin: '4px 0 0' }}>
              Go back to the Walk tab to see your new client.
            </p>
          </div>
        ) : (
          <>
            <input
              type="number"
              inputMode="numeric"
              maxLength={4}
              placeholder="1 2 3 4"
              value={addClientOtp}
              onChange={e => { setAddClientOtp(e.target.value.slice(0, 4)); setAddClientError(null) }}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '2px solid #E5E7EB',
                fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: '0.3em',
                fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            {addClientError && (
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#DC2626', margin: '0 0 8px' }}>
                {addClientError}
              </p>
            )}
            <button
              disabled={addClientOtp.length !== 4 || addClientLoading}
              onClick={async () => {
                setAddClientLoading(true)
                setAddClientError(null)
                try {
                  const res = await fetch(`/api/walker/${token}/add-client`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ otp: addClientOtp }),
                  })
                  const data = await res.json()
                  if (!res.ok) { setAddClientError(data.error ?? 'Something went wrong'); return }
                  setAddClientSuccess(data.message ?? `Connected to ${data.dogName}!`)
                  setAddClientOtp('')
                  // Refresh connections
                  setTimeout(() => window.location.reload(), 2000)
                } catch { setAddClientError('Network error. Try again.') }
                finally { setAddClientLoading(false) }
              }}
              style={{ width: '100%', minHeight: 52, borderRadius: 12, border: 'none',
                background: addClientOtp.length === 4 ? 'oklch(0.48 0.17 196)' : '#E5E7EB',
                color: addClientOtp.length === 4 ? '#fff' : '#9CA3AF',
                fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700,
                cursor: addClientOtp.length === 4 ? 'pointer' : 'not-allowed' }}
            >
              {addClientLoading ? 'Connecting…' : 'Connect →'}
            </button>
          </>
        )}
      </div>

    </div>
  )
}

export default function WalkerClient({
  token,
  dogName,
  dogBreed,
  dogPhotoUrl,
  healthNotes,
  ownerFirstName,
  walkerName,
  walkerPhone,
  walkerRole,
  ownerPhone,
  careFocus,
}: WalkerClientProps) {
  const [phase, setPhase] = useState<WalkPhase>('idle')
  const [logs, setLogs] = useState<WalkLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<WalkerTab>('walk')
  const [showSaveNotice, setShowSaveNotice] = useState(false)

  // Multi-client state
  const [connections, setConnections] = useState<ClientConnection[]>([])
  const [selectedToken, setSelectedToken] = useState<string>(token)
  const [showPicker, setShowPicker] = useState(false)
  const [addClientOtp, setAddClientOtp] = useState('')
  const [addClientLoading, setAddClientLoading] = useState(false)
  const [addClientSuccess, setAddClientSuccess] = useState<string | null>(null)
  const [addClientError, setAddClientError] = useState<string | null>(null)

  // Derived: the currently-selected dog's identity (walker may switch dogs via the picker).
  // Falls back to the URL token's props when no connection is selected yet (single-dog walkers).
  const selectedConn = connections.find(c => c.token === selectedToken)
  const activeDogName = selectedConn?.dogName ?? dogName
  const activeDogPhoto = selectedConn?.dogPhoto ?? dogPhotoUrl
  const activeDogBreed = selectedConn?.dogBreed ?? dogBreed
  const activeHealthNotes = selectedConn?.healthNotes ?? healthNotes

  // Demo walk state
  const [isDemoWalk, setIsDemoWalk] = useState(false)
  const [showDemoConfirm, setShowDemoConfirm] = useState(false)
  const [showDemoSuccess, setShowDemoSuccess] = useState(false)
  // demoStep: 1=walk+gps, 2=toilet hint, 3=potty hint, 4=walk to 200m, 5=end walk ready
  const [demoStep, setDemoStep] = useState(1)
  const [demoToiletDone, setDemoToiletDone] = useState(false)
  const [demoPottyDone, setDemoPottyDone] = useState(false)
  const [demoNudge, setDemoNudge] = useState<string | null>(null)
  const demoNudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const dismissed = localStorage.getItem(`pup-saved-${token}`)
    if (!dismissed) setShowSaveNotice(true)
  }, [token])

  useEffect(() => {
    fetch(`/api/walker/${token}/connections`)
      .then(r => r.json())
      .then((data: ClientConnection[]) => {
        if (Array.isArray(data) && data.length > 1) {
          setConnections(data)
          setShowPicker(true)  // show picker if multiple dogs
        }
      })
      .catch(() => {})
  }, [token])

  function dismissSaveNotice() {
    localStorage.setItem(`pup-saved-${token}`, '1')
    setShowSaveNotice(false)
  }

  // Walk tracking state
  const [elapsed, setElapsed] = useState(0)
  const [distanceKm, setDistanceKm] = useState(0)
  const [gpsRoute, setGpsRoute] = useState<GpsPoint[]>([])
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null)
  const routePointsRef = useRef<{ lat: number; lng: number }[]>([])
  const walkStartRef = useRef<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastPointRef = useRef<GpsPoint | null>(null)

  // Keep routePointsRef in sync with gpsRoute state (for LiveMap polyline)
  useEffect(() => {
    routePointsRef.current = gpsRoute.map(p => ({ lat: p.lat, lng: p.lng }))
  }, [gpsRoute])

  // Real-time walk events (pee/poop during walk)
  const [walkEvents, setWalkEvents] = useState<WalkEvent[]>([])
  const poopPhotoInputRef = useRef<HTMLInputElement>(null)
  const [poopPhotoUploading, setPoopPhotoUploading] = useState(false)
  const [poopPhotoPrompt, setPoopPhotoPrompt] = useState(false)
  const [pendingPoopEvent, setPendingPoopEvent] = useState<{ lat: number | null; lng: number | null; ts: string } | null>(null)

  // Log form state
  const [mood, setMood] = useState('')
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [parentWaLink, setParentWaLink] = useState<string | null>(null)
  const [reportUrl, setReportUrl] = useState<string | null>(null)

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `walk-photos/${token}/${Date.now()}.${ext}`
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.storage.from('provider-photos').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
        setPhotoUrl(data.publicUrl)
      }
    } finally {
      setUploading(false)
    }
  }

  async function handlePoopPhotoTaken(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingPoopEvent) return
    setPoopPhotoUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `poop-photos/${token}/${Date.now()}.${ext}`
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.storage.from('provider-photos').upload(path, file)
      const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
      setWalkEvents(prev => [...prev, {
        type: 'poop' as const,
        lat: pendingPoopEvent.lat,
        lng: pendingPoopEvent.lng,
        ts: pendingPoopEvent.ts,
        photoUrl: data.publicUrl,
      }])
    } catch {
      // photo failed — still add event without photo
      setWalkEvents(prev => [...prev, {
        type: 'poop' as const,
        lat: pendingPoopEvent.lat,
        lng: pendingPoopEvent.lng,
        ts: pendingPoopEvent.ts,
      }])
    } finally {
      setPoopPhotoUploading(false)
      setPoopPhotoPrompt(false)
      setPendingPoopEvent(null)
      // Reset input so same file can be picked again
      if (poopPhotoInputRef.current) poopPhotoInputRef.current.value = ''
    }
  }

  function handlePoopSkip() {
    if (!pendingPoopEvent) return
    setWalkEvents(prev => [...prev, {
      type: 'poop' as const,
      lat: pendingPoopEvent.lat,
      lng: pendingPoopEvent.lng,
      ts: pendingPoopEvent.ts,
    }])
    setPoopPhotoPrompt(false)
    setPendingPoopEvent(null)
  }

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/walker/${selectedToken}/logs`)
      if (res.ok) {
        const data = await res.json()
        setLogs(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently ignore
    } finally {
      setLogsLoading(false)
    }
  }, [selectedToken])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function retryGPS() {
    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point: GpsPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: new Date().toISOString(),
        }
        setCurrentPos({ lat: point.lat, lng: point.lng })
        setGpsError(null)
        // Resume watchPosition
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            // Reject only genuine multipath garbage (100m+) — see note in startWalk's
            // watchPosition callback for why 30m was starving gpsRoute in urban Mumbai.
            const accuracy = p.coords.accuracy
            if (accuracy > 100) return

            const pt: GpsPoint = {
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              ts: new Date().toISOString(),
              accuracy,
            }

            setGpsRoute((prev) => {
              const last = prev[prev.length - 1]
              if (last) {
                const delta = haversineKm(last.lat, last.lng, pt.lat, pt.lng)
                const elapsedSec = (new Date(pt.ts).getTime() - new Date(last.ts).getTime()) / 1000
                // Reject implausible jumps: a dog walk never exceeds ~15 km/h (4.2 m/s).
                // Allow generous margin (20 m/s ≈ 72 km/h) to avoid rejecting valid fast segments,
                // but still catch GPS teleport artifacts (jumping 200m in 1 second = 200 m/s).
                const impliedSpeed = elapsedSec > 0 ? (delta * 1000) / elapsedSec : 0
                if (impliedSpeed > 20) return prev // discard this point, keep previous route unchanged
                // Debounce GPS jitter: ignore a new fix under 3m from the last one if it
                // arrived within 5 seconds — otherwise a stationary walker generates a
                // jagged "spider web" from GPS noise alone, not real movement.
                if (delta * 1000 < 3 && elapsedSec < 5) return prev
                setDistanceKm((d) => +(d + delta).toFixed(3))
              }
              return [...prev, pt]
            })
            setCurrentPos({ lat: pt.lat, lng: pt.lng })
            lastPointRef.current = pt
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setGpsError('Location access denied. Distance won\'t be tracked.')
            }
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        )
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location access denied. Distance won\'t be tracked.')
        } else {
          setGpsError('Could not get location. Please try again.')
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  }

  // Demo step progression — driven by distanceKm and events
  useEffect(() => {
    if (!isDemoWalk || phase !== 'walking') return
    const dm = distanceKm * 1000 // metres

    if (demoStep === 1 && dm >= 50) {
      setDemoStep(2)
      setDemoNudge(null)
    } else if (demoStep === 2 && (demoToiletDone) ) {
      setDemoStep(3)
      setDemoNudge(null)
    } else if (demoStep === 3 && (demoPottyDone)) {
      setDemoStep(4)
      setDemoNudge(null)
    } else if (demoStep === 4 && dm >= 200) {
      setDemoStep(5)
      setDemoNudge(null)
    }
  }, [isDemoWalk, phase, distanceKm, demoStep, demoToiletDone, demoPottyDone])

  // Nudge timer — fire if walker hasn't advanced within 5s
  useEffect(() => {
    if (!isDemoWalk || phase !== 'walking') return
    if (demoNudgeTimer.current) clearTimeout(demoNudgeTimer.current)
    const nudges: Record<number, string[]> = {
      1: ['Take a few steps forward to see your route appear on the map 🗺️', 'Keep moving — walk forward with the phone! 👟'],
      2: ['Tap the 💧 Toilet button above to practice — it\'s safe, this is just a demo!', 'Try tapping Toilet 💧 now. Tap it even if Bruno didn\'t go!'],
      3: ['Now tap 💩 Potty to practice that button too!', 'Tap Potty 💩 to try it — no photo will open in demo mode'],
      4: ['Keep walking! Almost at 200m 🐕', `${Math.round(200 - distanceKm * 1000)}m more — you\'re doing great!`],
      5: ['Tap the red End Walk button below to finish ↓', 'Great job! Tap End Walk to see the report ↓'],
    }
    const msgs = nudges[demoStep] ?? []
    let i = 0
    function scheduleNudge() {
      demoNudgeTimer.current = setTimeout(() => {
        setDemoNudge(msgs[i % msgs.length] ?? null)
        i++
        scheduleNudge()
      }, 5000)
    }
    scheduleNudge()
    return () => { if (demoNudgeTimer.current) clearTimeout(demoNudgeTimer.current) }
  }, [isDemoWalk, phase, demoStep]) // eslint-disable-line react-hooks/exhaustive-deps

  function startWalk() {
    setGpsRoute([])
    setDistanceKm(0)
    setElapsed(0)
    setGpsError(null)
    setCurrentPos(null)
    setWalkEvents([])
    setDemoStep(1)
    setDemoToiletDone(false)
    setDemoPottyDone(false)
    setDemoNudge(null)
    setPhase('walking')
    walkStartRef.current = new Date()

    // Notify parent via server-side email (fire-and-forget — never blocks the walker)
    if (!isDemoWalk) {
      fetch('/api/walks/notify-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_token: selectedToken }),
      }).catch(() => {})
    }

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    // Start GPS
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          // Reject only genuine multipath garbage (100m+). Dense Mumbai neighbourhoods
          // (tall buildings, narrow lanes) routinely give 40-80m accuracy on real Android
          // phones even while moving normally — a stricter cutoff here starves gpsRoute
          // almost entirely, which is why every report used to look the same (empty route).
          const accuracy = pos.coords.accuracy
          if (accuracy > 100) return

          const point: GpsPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            ts: new Date().toISOString(),
            accuracy,
          }

          setGpsRoute((prev) => {
            const last = prev[prev.length - 1]
            if (last) {
              const delta = haversineKm(last.lat, last.lng, point.lat, point.lng)
              const elapsedSec = (new Date(point.ts).getTime() - new Date(last.ts).getTime()) / 1000
              // Reject implausible jumps: a dog walk never exceeds ~15 km/h (4.2 m/s).
              // Allow generous margin (20 m/s ≈ 72 km/h) to avoid rejecting valid fast segments,
              // but still catch GPS teleport artifacts (jumping 200m in 1 second = 200 m/s).
              const impliedSpeed = elapsedSec > 0 ? (delta * 1000) / elapsedSec : 0
              if (impliedSpeed > 20) return prev // discard this point, keep previous route unchanged
              // Debounce GPS jitter: ignore a new fix under 3m from the last one if it
              // arrived within 5 seconds — a stationary walker otherwise generates a
              // jagged "spider web" from GPS noise alone, not real movement.
              if (delta * 1000 < 3 && elapsedSec < 5) return prev
              setDistanceKm((d) => +(d + delta).toFixed(3))
            }
            return [...prev, point]
          })
          setCurrentPos({ lat: point.lat, lng: point.lng })
          lastPointRef.current = point
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError('Location access denied. Distance won\'t be tracked.')
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      )
    } else {
      setGpsError('GPS not available on this device.')
    }
  }

  function endWalk() {
    // Demo mode: gate on 200m
    if (isDemoWalk && distanceKm * 1000 < 200) {
      const remaining = Math.round(200 - distanceKm * 1000)
      setDemoNudge(`Walk ${remaining}m more before ending the practice walk`)
      return
    }
    if (demoNudgeTimer.current) clearTimeout(demoNudgeTimer.current)
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    // Stop GPS
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setPhase('logging')
    // Camera is optional — walker taps the photo button themselves
  }

  function handlePeeTap() {
    const loc = lastPointRef.current
    setWalkEvents(prev => [...prev, {
      type: 'pee',
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      ts: new Date().toISOString(),
    }])
    // Advance demo step
    if (isDemoWalk && demoStep === 2) {
      setDemoToiletDone(true)
      setDemoNudge('Great! 💧 Toilet logged. Now try 💩 Potty →')
    }
  }

  function handlePoopTap() {
    const loc = lastPointRef.current
    // In demo mode skip the prompt and add event directly
    if (isDemoWalk) {
      setWalkEvents(prev => [...prev, {
        type: 'poop',
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        ts: new Date().toISOString(),
        photoUrl: null,
      }])
      if (demoStep === 3) {
        setDemoPottyDone(true)
        setDemoNudge('Great! 💩 Potty logged. Now keep walking to 200m →')
      }
      return
    }
    // Real walk — store pending event and show photo prompt sheet
    setPendingPoopEvent({
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      ts: new Date().toISOString(),
    })
    setPoopPhotoPrompt(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Demo walk — skip API, go straight to demo success screen
    if (isDemoWalk) {
      setMood('')
      setNotes('')
      setPhotoUrl(null)
      setElapsed(0)
      setDistanceKm(0)
      setGpsRoute([])
      setWalkEvents([])
      setPhase('idle')
      setShowDemoSuccess(true)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    const durationMins = Math.max(1, Math.round(elapsed / 60))

    const finalPoopCount = walkEvents.filter(e => e.type === 'poop').length
    const finalPeeCount = walkEvents.filter(e => e.type === 'pee').length

    try {
      const res = await fetch('/api/walk-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_token: selectedToken,
          duration_mins: durationMins,
          distance_km: distanceKm > 0 ? +distanceKm.toFixed(2) : null,
          gps_route: gpsRoute.length > 0 ? gpsRoute : null,
          photo_url: photoUrl ?? null,
          poop_count: finalPoopCount,
          pee_count: finalPeeCount,
          mood: mood || null,
          notes: notes.trim() || null,
          started_at: walkStartRef.current?.toISOString() ?? null,
          ended_at: new Date().toISOString(),
          walk_events: walkEvents,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to submit. Please try again.')
        setSubmitting(false)
        return
      }

      // Reset walk state, go to success screen
      if (data.wa_link) setParentWaLink(data.wa_link)
      // Always use relative path so it opens on current domain (not old Vercel URL)
      if (data.report_token) {
        setReportUrl(`/walk-report/${data.report_token}`)
      } else if (data.report_url) {
        // Fallback: strip domain from URL and use relative path
        try {
          const url = new URL(data.report_url)
          setReportUrl(url.pathname)
        } catch {
          setReportUrl(data.report_url)
        }
      }
      setMood('')
      setNotes('')
      setPhotoUrl(null)
      setElapsed(0)
      setDistanceKm(0)
      setGpsRoute([])
      setWalkEvents([])
      setPhase('success')
      fetchLogs()
      // Auto-open WhatsApp to owner with report link — walker just taps Send
      if (data.wa_link) {
        setTimeout(() => window.open(data.wa_link, '_blank', 'noopener'), 700)
      }
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current)
    }
  }, [])

  // Derived counts for during-walk display
  const livePeeCount = walkEvents.filter(ev => ev.type === 'pee').length
  const livePoopCount = walkEvents.filter(ev => ev.type === 'poop').length

  // Poop photos from walk events
  const poopPhotos = walkEvents.filter(ev => ev.type === 'poop' && ev.photoUrl)

  return (
    <div className="min-h-screen pb-24" style={{ background: '#FFFBEB', fontFamily: 'var(--font-nunito), sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#0A2F35] text-white rounded-2xl px-5 py-4 text-sm font-semibold text-center shadow-xl animate-bounce-once"
          style={{ fontFamily: 'var(--font-nunito)' }}>
          {toast}
        </div>
      )}

      {/* ─── FEATURE 1: GPS Permission Recovery Screen ─── */}
      {phase === 'walking' && gpsError !== null && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: '#FFFBEB',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 20px 40px',
          overflowY: 'auto',
        }}>
          {/* Back button */}
          <div style={{ paddingTop: 52, paddingBottom: 8 }}>
            <button
              onClick={() => { setPhase('idle'); setGpsError(null) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-white shadow-md text-gray-700 active:opacity-60 transition-opacity"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              ← Back
            </button>
          </div>

          {/* Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 20 }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'oklch(0.48 0.17 196)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}>
              📍
            </div>
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: 'var(--font-fredoka)',
            fontSize: 24,
            fontWeight: 700,
            color: '#0A2F35',
            textAlign: 'center',
            margin: '0 0 10px',
          }}>
            Location access needed
          </h1>

          {/* Subtext */}
          <p style={{
            fontFamily: 'var(--font-nunito)',
            fontSize: 14,
            color: '#64748B',
            textAlign: 'center',
            margin: '0 0 28px',
            lineHeight: 1.6,
          }}>
            Without GPS, {ownerFirstName} cannot see the route {dogName} walked.
          </p>

          {/* Android steps */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '16px 16px',
            marginBottom: 14,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <p style={{
              fontFamily: 'var(--font-fredoka)',
              fontSize: 13,
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 12px',
            }}>
              On Android
            </p>
            {[
              'Open Chrome Settings (three dots, top right)',
              'Tap "Site settings"',
              'Find "Location" and allow',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'oklch(0.48 0.17 196)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-fredoka)',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#0A2F35', margin: 0, lineHeight: 1.5 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>

          {/* iPhone steps */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '16px 16px',
            marginBottom: 28,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <p style={{
              fontFamily: 'var(--font-fredoka)',
              fontSize: 13,
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 12px',
            }}>
              On iPhone
            </p>
            {[
              'Go to Settings → Safari',
              'Tap "Location"',
              'Select "Allow"',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'oklch(0.48 0.17 196)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-fredoka)',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#0A2F35', margin: 0, lineHeight: 1.5 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>

          {/* Try again button */}
          <button
            onClick={retryGPS}
            className="w-full active:scale-[0.97] transition-transform"
            style={{
              background: 'oklch(0.48 0.17 196)',
              borderRadius: 16,
              minHeight: 56,
              border: 'none',
              fontFamily: 'var(--font-fredoka)',
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Try location again
          </button>
        </div>
      )}

      {/* ─── FEATURE 3: Demo Confirm Bottom Sheet ─── */}
      {showDemoConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowDemoConfirm(false)}
        >
          <div
            style={{
              background: '#FFFBEB',
              borderRadius: '20px 20px 0 0',
              padding: '12px 20px 40px',
              width: '100%',
              animation: 'slideUp 200ms ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 40, height: 4, borderRadius: 100, background: '#CBD5E1' }} />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-fredoka)',
              fontSize: 20,
              fontWeight: 700,
              color: '#0A2F35',
              margin: '0 0 10px',
            }}>
              Practice walk
            </h2>
            <p style={{
              fontFamily: 'var(--font-nunito)',
              fontSize: 14,
              color: '#64748B',
              margin: '0 0 24px',
              lineHeight: 1.6,
            }}>
              This is a practice run. No report will be sent to anyone. You&apos;ll see exactly how the real walk works.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  setShowDemoConfirm(false)
                  setIsDemoWalk(true)
                  startWalk()
                }}
                className="w-full active:scale-[0.97] transition-transform"
                style={{
                  background: '#FF8C52',
                  borderRadius: 16,
                  minHeight: 56,
                  border: 'none',
                  fontFamily: 'var(--font-fredoka)',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Start practice walk
              </button>
              <button
                onClick={() => {
                  setShowDemoConfirm(false)
                  setIsDemoWalk(false)
                  startWalk()
                }}
                className="w-full active:scale-[0.97] transition-transform"
                style={{
                  background: 'transparent',
                  borderRadius: 16,
                  minHeight: 44,
                  border: '2px solid oklch(0.48 0.17 196)',
                  fontFamily: 'var(--font-fredoka)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'oklch(0.48 0.17 196)',
                  cursor: 'pointer',
                }}
              >
                Skip — start real walk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FEATURE 3: Demo Success Screen ─── */}
      {showDemoSuccess && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: '#FFFBEB',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#DCFCE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            marginBottom: 20,
          }}>
            ✅
          </div>
          <h2 style={{ fontFamily: 'var(--font-fredoka)', fontSize: 28, fontWeight: 700, color: '#0A2F35', textAlign: 'center', margin: '0 0 10px' }}>
            Practice complete! 🎉
          </h2>
          {/* What they accomplished */}
          <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 14, padding: '12px 16px', marginBottom: 24, width: '100%', maxWidth: 360 }}>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 13, fontWeight: 700, color: '#166534', margin: '0 0 8px' }}>You practised:</p>
            {[
              { done: true, label: `Walked ${Math.round(distanceKm * 1000)}m with GPS tracking` },
              { done: demoToiletDone, label: 'Tapped Toilet 💧 button' },
              { done: demoPottyDone, label: 'Tapped Potty 💩 button' },
              { done: true, label: 'Took a dog photo 📸' },
              { done: true, label: 'Generated the report' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{item.done ? '✅' : '⬜'}</span>
                <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: item.done ? '#166534' : '#94A3B8', margin: 0 }}>{item.label}</p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#64748B', textAlign: 'center', margin: '0 0 28px', lineHeight: 1.6 }}>
            Now you know exactly what to do on the real walk with {dogName}.
          </p>
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => {
                setShowDemoSuccess(false)
                setIsDemoWalk(false)
                setPhase('idle')
              }}
              className="w-full active:scale-[0.97] transition-transform"
              style={{
                background: '#FF8C52',
                borderRadius: 16,
                minHeight: 56,
                border: 'none',
                fontFamily: 'var(--font-fredoka)',
                fontSize: 18,
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Start real walk now
            </button>
            <button
              onClick={() => {
                setShowDemoSuccess(false)
                setIsDemoWalk(true)
                startWalk()
              }}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-nunito)',
                fontSize: 13,
                color: 'oklch(0.48 0.17 196)',
                textDecoration: 'underline',
                padding: '8px 16px',
                minHeight: 44,
                cursor: 'pointer',
              }}
            >
              Watch again
            </button>
          </div>
        </div>
      )}

      {/* Hidden poop photo input (used during walk) */}
      <input
        ref={poopPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePoopPhotoTaken}
      />

      {/* Poop photo prompt bottom sheet */}
      {poopPhotoPrompt && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70, background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 20px', paddingBottom: 'env(safe-area-inset-bottom, 20px)', boxShadow: '0 -8px 32px rgba(10,47,53,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 20, fontWeight: 700, color: '#0A2F35', margin: '0 0 6px', textAlign: 'center' }}>
              💩 Poop marked!
            </p>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#6B7280', margin: '0 0 20px', textAlign: 'center' }}>
              Add a photo? The owner can see it in the report.
            </p>
            <button
              onClick={() => poopPhotoInputRef.current?.click()}
              disabled={poopPhotoUploading}
              style={{ width: '100%', padding: '14px', borderRadius: 16, background: '#FF8C52', color: '#fff', fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', marginBottom: 10, opacity: poopPhotoUploading ? 0.6 : 1 }}>
              {poopPhotoUploading ? 'Uploading...' : '📷 Take photo'}
            </button>
            <button
              onClick={handlePoopSkip}
              disabled={poopPhotoUploading}
              style={{ width: '100%', padding: '14px', borderRadius: 16, background: '#F3F4F6', color: '#6B7280', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Skip
            </button>
          </div>
        </>
      )}

      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <span className="text-xl font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-fredoka)' }}>
          PupStep 🐾
        </span>
        <span className="text-sm text-slate-500" style={{ fontFamily: 'var(--font-nunito)' }}>
          Hi, {walkerName}
        </span>
      </div>

      {/* Tab content */}
      {activeTab === 'walk' && (
        <>
          {/* Dog card */}
          <div className="mx-5 mb-5 rounded-2xl bg-white border border-slate-100 px-4 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden"
              style={{ background: '#FF8C52' }}>
              {activeDogPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeDogPhoto} alt={activeDogName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🐕</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 font-medium">You&apos;re walking</p>
              <p className="font-bold text-[#0A2F35] text-xl leading-tight" style={{ fontFamily: 'var(--font-fredoka)' }}>
                {activeDogName}
              </p>
              {activeDogBreed && <p className="text-xs text-slate-400">{activeDogBreed}</p>}
            </div>
            {phase === 'walking' && (
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-green-700">Live</span>
              </div>
            )}
          </div>

          {/* Health note */}
          {activeHealthNotes && (
            <div className="mx-5 mb-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
              <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-sm text-amber-800 font-medium"><strong>Health note:</strong> {activeHealthNotes}</p>
            </div>
          )}

          {/* ─── IDLE PHASE ─── */}
          {phase === 'idle' && showPicker && (
            <div className="px-5 pt-6 pb-24">
              <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 24, fontWeight: 700, color: '#0A2F35', marginBottom: 6 }}>
                Who are you walking today? 🐕
              </p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', marginBottom: 24 }}>
                Choose the dog for this walk
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {connections.map(c => (
                  <button
                    key={c.token}
                    onClick={() => {
                      setSelectedToken(c.token)
                      setShowPicker(false)
                    }}
                    style={{
                      background: '#fff', borderRadius: 18, padding: '16px',
                      border: `2px solid ${selectedToken === c.token ? 'oklch(0.48 0.17 196)' : '#E5E7EB'}`,
                      display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer',
                    }}
                  >
                    {/* Dog photo */}
                    <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      background: 'oklch(0.94 0.06 196)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {c.dogPhoto
                        ? <img src={c.dogPhoto} alt={c.dogName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 24 }}>🐕</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 18, fontWeight: 700, color: '#0A2F35', margin: 0 }}>
                        {c.dogName}
                      </p>
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                        {c.ownerFirstName}&apos;s dog
                        {c.lastWalkDate ? ` · Last walked ${relativeTime(c.lastWalkDate)}` : ' · Never walked'}
                      </p>
                    </div>
                    <span style={{ fontSize: 20, color: 'oklch(0.48 0.17 196)' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'idle' && !showPicker && (
            <div className="px-5 space-y-4">
              {/* Change dog button — shown when walker has multiple clients */}
              {connections.length > 1 && (
                <button
                  onClick={() => setShowPicker(true)}
                  style={{ background: 'none', border: 'none', fontFamily: 'var(--font-nunito)', fontSize: 13,
                    color: 'oklch(0.48 0.17 196)', fontWeight: 600, cursor: 'pointer', padding: '8px 0', minHeight: 44 }}>
                  ← Change dog
                </button>
              )}
              {/* First-time save notice */}
              {showSaveNotice && (
                <div
                  className="rounded-2xl px-4 py-4 flex gap-3 items-start"
                  style={{ background: '#F0FDFA', border: '1.5px solid #99F6E4' }}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0D9488] mb-0.5" style={{ fontFamily: 'var(--font-fredoka)' }}>
                      Save your dashboard link
                    </p>
                    <p className="text-xs text-teal-700 mb-3 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                      Your client will send you this link on WhatsApp. Tap the button below to save it yourself too.
                    </p>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`My PupStep dashboard for ${dogName} 🐾\nTap to log walks:\n${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={dismissSaveNotice}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                      style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', textDecoration: 'none' }}
                    >
                      📲 Save my dashboard link
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={dismissSaveNotice}
                    className="text-teal-400 hover:text-teal-600 flex-shrink-0 text-lg leading-none"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}

              {healthNotes && (
                <div style={{
                  background: '#FFF7ED',
                  border: '1.5px solid #FED7AA',
                  borderRadius: 14,
                  padding: '12px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                  <div>
                    <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: '#92400E', margin: '0 0 3px' }}>
                      Health notes from owner
                    </p>
                    <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#B45309', margin: 0, lineHeight: 1.5 }}>
                      {healthNotes}
                    </p>
                  </div>
                </div>
              )}
              {careFocus && careFocus !== 'normal' && CARE_FOCUS_CONFIG[careFocus] && (() => {
                const cfg = CARE_FOCUS_CONFIG[careFocus]
                return (
                  <div style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                    <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: cfg.color, margin: '0 0 4px' }}>
                      {cfg.emoji} {cfg.label}
                    </p>
                    <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: cfg.color, margin: 0, lineHeight: 1.5 }}>
                      {cfg.walkerNote}
                    </p>
                  </div>
                )
              })()}
              <button
                onClick={() => { setIsDemoWalk(false); startWalk() }}
                className="w-full py-5 rounded-2xl font-bold text-2xl text-white shadow-lg active:scale-[0.97] transition-transform"
                style={{ background: 'linear-gradient(135deg, #FF8C52 0%, #F07030 100%)', fontFamily: 'var(--font-fredoka)' }}
              >
                🐾 Start Walk
              </button>
              <div className="flex flex-col items-center gap-1">
                <p className="text-center text-xs text-slate-400">GPS tracking starts automatically when you begin</p>
                <button
                  onClick={() => setShowDemoConfirm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--font-nunito)',
                    fontSize: 13,
                    color: 'oklch(0.48 0.17 196)',
                    textDecoration: 'underline',
                    marginTop: 8,
                    padding: '8px 16px',
                    minHeight: 44,
                    cursor: 'pointer',
                  }}
                >
                  Try a practice walk first
                </button>
              </div>

              {/* First-time guide card — only shown before any walks are logged */}
              {logs.length === 0 && !logsLoading && (
                <div
                  className="rounded-2xl px-5 py-5 mt-2"
                  style={{ background: '#FFF3E0' }}
                >
                  <p
                    className="font-bold text-[#0A2F35] text-base mb-4"
                    style={{ fontFamily: 'var(--font-fredoka)' }}
                  >
                    How to log a walk 👇
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">🟠</span>
                      <p className="text-xs font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Tap Start Walk
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        When you leave home
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">📍</span>
                      <p className="text-xs font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Walk as normal
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        GPS tracks your route automatically
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">✅</span>
                      <p className="text-xs font-bold text-[#0A2F35]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Tap End Walk
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Fill in a quick 60-sec report
                      </p>
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-amber-600 font-semibold mt-4"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    The owner gets a report on WhatsApp automatically
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── WALKING PHASE ─── */}
          {phase === 'walking' && (
            <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
              {/* ── Live map — top 46vh ── */}
              <div className="relative w-full flex-shrink-0" style={{ height: '46vh' }}>
                {/* Derive map event arrays from walkEvents */}
                {(() => {
                  const poopEventsForMap = walkEvents.filter(e => e.type === 'poop' && e.lat != null && e.lng != null) as { lat: number; lng: number; ts: string }[]
                  const peeEventsForMap = walkEvents.filter(e => e.type === 'pee' && e.lat != null && e.lng != null) as { lat: number; lng: number; ts: string }[]
                  return (
                    <LiveMap
                      currentPos={currentPos}
                      routePointsRef={routePointsRef}
                      poopEvents={poopEventsForMap}
                      peeEvents={peeEventsForMap}
                    />
                  )
                })()}

                {/* Back button — floating top-left */}
                <button
                  onClick={() => setPhase('idle')}
                  className="absolute top-4 left-4 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-white shadow-md text-gray-700 active:opacity-60 transition-opacity"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  ← Back
                </button>

                {/* Poop/pee live counts — floating top-right */}
                <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white bg-opacity-90 rounded-full px-3 py-1.5 shadow-md">
                  <span className="text-sm font-bold text-gray-700">💩 {livePoopCount}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-sm font-bold text-gray-700">💧 {livePeeCount}</span>
                </div>

                {/* Timer + distance HUD — floating bottom of map */}
                <div
                  className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between px-4 py-3"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)' }}
                >
                  <div>
                    <p className="text-3xl font-bold text-white tabular-nums tracking-tight leading-none"
                      style={{ fontFamily: 'var(--font-fredoka)' }}>
                      {formatElapsed(elapsed)}
                    </p>
                    <p className="text-sm font-semibold text-white/80 mt-0.5">{distanceKm.toFixed(2)} km</p>
                  </div>
                </div>

                {/* GPS error overlay */}
                {gpsError && (
                  <div className="absolute top-14 left-4 right-4 z-10 px-3 py-2 rounded-xl text-xs text-amber-800 text-center"
                    style={{ background: '#FFFBEB', border: '1px solid #FED7AA' }}>
                    ⚠️ {gpsError}
                  </div>
                )}

                {/* Getting GPS spinner */}
                {!currentPos && !gpsError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <p className="text-sm">Getting GPS…</p>
                    </div>
                  </div>
                )}

                {/* PRACTICE banner */}
                {isDemoWalk && (
                  <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: '#FF8C52', borderRadius: 100, padding: '4px 14px' }}>
                    <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 12, fontWeight: 700, color: '#fff', margin: 0 }}>PRACTICE</p>
                  </div>
                )}
              </div>

              {/* ── Controls — bottom section ── */}
              <div className="flex-1 flex flex-col px-5 pt-4 pb-6 gap-3" style={{ background: '#FFFBEB' }}>
                {/* Care Focus banner — walking phase */}
                {careFocus && careFocus !== 'normal' && CARE_FOCUS_CONFIG[careFocus] && (() => {
                  const cfg = CARE_FOCUS_CONFIG[careFocus]
                  return (
                    <div style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                      <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: cfg.color, margin: '0 0 4px' }}>
                        {cfg.emoji} {cfg.label}
                      </p>
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: cfg.color, margin: 0, lineHeight: 1.5 }}>
                        {cfg.walkerNote}
                      </p>
                    </div>
                  )
                })()}

                {/* FEATURE 2: Health notes pinned during walk */}
                {healthNotes && (
                  <div style={{
                    background: '#FFFBEB',
                    border: '2px solid #FCD34D',
                    borderRadius: 14,
                    padding: '10px 14px',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                    <div>
                      <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>
                        {dogName}&apos;s health notes
                      </p>
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#78350F', margin: 0, lineHeight: 1.5 }}>
                        {healthNotes}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── DEMO guided hint system ── */}
                {isDemoWalk && (() => {
                  const dm = Math.round(distanceKm * 1000)
                  const remaining = Math.max(0, 200 - dm)
                  // Step hint card
                  const stepHints: Record<number, { icon: string; text: string; color: string; border: string }> = {
                    1: { icon: '🗺️', text: `Walk forward to see your route on the map`, color: '#0A2F35', border: 'oklch(0.88 0.06 196)' },
                    2: { icon: '💧', text: `If Bruno does susu (toilet), tap the Toilet button now`, color: '#1D4ED8', border: '#BFDBFE' },
                    3: { icon: '💩', text: `If Bruno does potty, tap the Potty button now`, color: '#92400E', border: '#FDE047' },
                    4: { icon: '🐕', text: `Keep walking — ${remaining}m more to finish the practice`, color: '#0A2F35', border: 'oklch(0.88 0.06 196)' },
                    5: { icon: '✅', text: `Great walk! Now tap End Walk to finish the practice`, color: '#166534', border: '#86EFAC' },
                  }
                  const hint = stepHints[demoStep]
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Step indicator dots */}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {[1,2,3,4,5].map(s => (
                          <div key={s} style={{
                            width: s < demoStep ? 20 : s === demoStep ? 28 : 8,
                            height: 8, borderRadius: 100,
                            background: s < demoStep ? 'oklch(0.48 0.17 196)' : s === demoStep ? '#FF8C52' : '#E2E8F0',
                            transition: 'all 0.3s ease',
                          }} />
                        ))}
                      </div>
                      {/* Active hint */}
                      <div style={{ background: '#fff', border: `2px solid ${hint.border}`, borderRadius: 14, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{hint.icon}</span>
                        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, color: hint.color, margin: 0, lineHeight: 1.4 }}>
                          {demoNudge ?? hint.text}
                        </p>
                      </div>
                      {/* Progress bar for steps 1 + 4 */}
                      {(demoStep === 1 || demoStep === 4) && (
                        <div style={{ background: '#F1F5F9', borderRadius: 100, height: 8, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (dm / 200) * 100)}%`,
                            background: 'oklch(0.48 0.17 196)',
                            borderRadius: 100,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      )}
                      {(demoStep === 1 || demoStep === 4) && (
                        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#64748B', textAlign: 'center', margin: 0 }}>
                          {dm}m / 200m walked
                        </p>
                      )}
                      {/* Skip buttons for steps 2 and 3 */}
                      {demoStep === 2 && (
                        <button onClick={() => { setDemoToiletDone(true); setDemoNudge(null) }}
                          style={{ background: 'none', border: 'none', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94A3B8', textDecoration: 'underline', cursor: 'pointer', padding: '4px 0', minHeight: 36 }}>
                          Bruno didn't go — skip this step →
                        </button>
                      )}
                      {demoStep === 3 && (
                        <button onClick={() => { setDemoPottyDone(true); setDemoNudge(null) }}
                          style={{ background: 'none', border: 'none', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94A3B8', textDecoration: 'underline', cursor: 'pointer', padding: '4px 0', minHeight: 36 }}>
                          Bruno didn't go — skip this step →
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* Keep screen open banner — real walks only */}
                {!isDemoWalk && (
                <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                  style={{ background: 'oklch(0.97 0.02 196)', border: '1px solid oklch(0.88 0.06 196)' }}>
                  <span className="text-base flex-shrink-0">📱</span>
                  <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: 'oklch(0.40 0.17 196)', margin: 0, fontWeight: 600 }}>
                    Keep this screen open during the walk to track GPS
                  </p>
                </div>
                )}

                {/* Pee / Poop tap buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Toilet button */}
                  <button
                    type="button"
                    onClick={handlePeeTap}
                    className="rounded-2xl border-2 border-blue-200 bg-blue-50 flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-transform"
                    style={{ minHeight: 80 }}
                  >
                    <span className="text-3xl">💧</span>
                    <span className="text-sm font-bold text-blue-700" style={{ fontFamily: 'var(--font-fredoka)' }}>
                      Toilet 💧
                    </span>
                    {livePeeCount > 0 && (
                      <span className="text-xs font-bold text-blue-500 bg-blue-100 rounded-full px-2 py-0.5">
                        💧 {livePeeCount}
                      </span>
                    )}
                  </button>

                  {/* Potty button */}
                  <div className="flex flex-col gap-1">
                    {(careFocus === 'stomach' || careFocus === 'recovery') && (
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, color: '#854D0E', textAlign: 'center', margin: 0 }}>📸 Photo important today</p>
                    )}
                    <button
                      type="button"
                      onClick={handlePoopTap}
                      className="rounded-2xl border-2 border-amber-200 bg-amber-50 flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-transform"
                      style={{ minHeight: 80, boxShadow: (careFocus === 'stomach' || careFocus === 'recovery') ? '0 0 0 3px rgba(255,140,82,0.4)' : undefined }}
                    >
                      <span className="text-3xl">💩</span>
                      <span className="text-sm font-bold text-amber-700" style={{ fontFamily: 'var(--font-fredoka)' }}>
                        Potty + Photo 💩
                      </span>
                      {livePoopCount > 0 && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
                          💩 {livePoopCount}
                          {poopPhotoUploading && ' ⏳'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Poop photo thumbnails strip */}
                {poopPhotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {poopPhotos.map((ev, i) => (
                      ev.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={ev.photoUrl}
                          alt={`Poop photo ${i + 1}`}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow"
                        />
                      ) : null
                    ))}
                  </div>
                )}

                {/* End Walk button */}
                <div className="mt-auto">
                  {isDemoWalk && demoStep < 5 ? (
                    <div style={{ background: '#F1F5F9', borderRadius: 18, padding: '14px 16px', textAlign: 'center' }}>
                      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#64748B', margin: 0, fontWeight: 600 }}>
                        Complete the steps above first · {Math.max(0, Math.round(200 - distanceKm * 1000))}m remaining
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={endWalk}
                      className="w-full py-4 rounded-2xl font-bold text-xl text-white shadow-md active:scale-[0.97] transition-transform"
                      style={{ background: isDemoWalk ? '#FF8C52' : '#DC2626', fontFamily: 'var(--font-fredoka)' }}
                    >
                      {isDemoWalk ? 'End Practice Walk ✓' : 'End Walk'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── LOGGING PHASE ─── */}
          {phase === 'logging' && (
            <div className="px-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* A) Walk summary card */}
                {(() => {
                  const finalPoopCount = walkEvents.filter(e => e.type === 'poop').length
                  const finalPeeCount = walkEvents.filter(e => e.type === 'pee').length
                  return (
                    <div style={{ background: 'oklch(0.94 0.06 196)', borderRadius: 16, padding: '14px 16px' }}>
                      <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 16, fontWeight: 700, color: 'oklch(0.40 0.17 196)', margin: '0 0 6px' }}>
                        This walk summary
                      </p>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>⏱ {Math.floor(elapsed / 60)} min</span>
                        {distanceKm > 0 && <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>📍 {distanceKm.toFixed(1)} km</span>}
                        {finalPoopCount > 0 && <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>💩 {finalPoopCount} potty</span>}
                        {finalPeeCount > 0 && <span style={{ fontSize: 14, color: '#0A2F35', fontWeight: 600 }}>💧 {finalPeeCount} toilet</span>}
                      </div>
                    </div>
                  )
                })()}

                {/* B) Dog photo */}
                <div>
                  <label className="block text-sm font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                    Take a photo of {dogName} 📸
                  </label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                  {photoUrl ? (
                    <div className="relative w-full rounded-xl overflow-hidden" style={{ maxHeight: 220 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl} alt="Walk photo" className="w-full object-cover rounded-xl" style={{ maxHeight: 220 }} />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(null)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black bg-opacity-50 text-white text-sm flex items-center justify-center"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 transition-colors disabled:opacity-60"
                      style={{ borderColor: 'oklch(0.70 0.13 196)', color: 'oklch(0.48 0.17 196)' }}
                    >
                      <span className="text-3xl">{uploading ? '⏳' : '📷'}</span>
                      <span className="text-sm font-bold">{uploading ? 'Uploading…' : 'Tap to take a photo'}</span>
                    </button>
                  )}
                </div>

                {/* C) Mood — 3 big emoji buttons */}
                <div>
                  <label className="block text-sm font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                    How was {dogName}?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {MOOD_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => setMood(mood === opt.value ? '' : opt.value)}
                        className="flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-[0.97]"
                        style={{
                          borderColor: mood === opt.value ? 'oklch(0.48 0.17 196)' : '#E2E8F0',
                          background: mood === opt.value ? 'oklch(0.95 0.04 196)' : '#fff',
                          color: mood === opt.value ? 'oklch(0.40 0.17 196)' : '#64748B',
                        }}>
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-fredoka)' }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* D) Notes — small, optional */}
                <div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything to tell the owner? (optional)"
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-none"
                    style={{ outlineColor: 'oklch(0.48 0.17 196)' }}
                  />
                </div>

                {submitError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex flex-col gap-2">
                    <p className="text-sm text-red-700">{submitError}</p>
                    <button
                      type="button"
                      onClick={() => { setSubmitError(null); setPhase('idle') }}
                      className="text-xs font-bold text-red-500 underline text-left"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      ← Back to dashboard
                    </button>
                  </div>
                )}

                <button type="submit" disabled={submitting}
                  className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md min-h-[56px]"
                  style={{ background: '#FF8C52', fontFamily: 'var(--font-fredoka)' }}>
                  {submitting ? 'Sending report…' : `Send to ${ownerFirstName} ✓`}
                </button>
              </form>
            </div>
          )}

          {/* ─── SUCCESS PHASE ─── */}
          {phase === 'success' && (
            <div className="px-5 flex flex-col items-center text-center pt-8 pb-24">
              {(() => {
                // Use selected connection's owner name — not the URL token's owner
                const selectedConn = connections.find(c => c.token === selectedToken)
                const successOwner = selectedConn?.ownerFirstName ?? ownerFirstName
                const successDog = selectedConn?.dogName ?? dogName
                return (
                  <>
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-3xl font-bold text-[#0A2F35] mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                {successDog}&apos;s walk done!
              </h2>
              <p className="text-sm text-slate-500 mb-1 leading-relaxed px-4" style={{ fontFamily: 'var(--font-nunito)' }}>
                {successOwner
                  ? `Report sent to ${successOwner}. WhatsApp is opening now.`
                  : 'Report sent to the owner.'}
              </p>
              <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 24 }}>
                PupStep has also emailed the report to the owner.
              </p>

              <div className="w-full max-w-sm space-y-3">
                {/* Primary: send to owner WhatsApp */}
                {parentWaLink && (
                  <a
                    href={parentWaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-base shadow-md"
                    style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)', fontSize: '17px' }}
                  >
                    📲 Send report to {ownerFirstName ?? 'owner'}
                  </a>
                )}

                {/* Primary action: go back to dashboard to log another walk */}
                <button
                  onClick={() => {
                    setPhase('idle')
                    setReportUrl(null)
                    setParentWaLink(null)
                    // Re-show picker so walker chooses the next dog
                    if (connections.length > 1) setShowPicker(true)
                  }}
                  className="w-full py-4 rounded-2xl font-bold text-lg text-white active:scale-[0.97] transition-transform"
                  style={{ background: '#FF8C52', fontFamily: 'var(--font-fredoka)' }}
                >
                  🐕 Log another walk
                </button>

                {/* Save dashboard link to WhatsApp */}
                {(() => {
                  const dashUrl = typeof window !== 'undefined'
                    ? `${window.location.origin}/walker/${token}`
                    : `https://pupstep.in/walker/${token}`
                  const waText = encodeURIComponent(
                    `My PupStep walker dashboard for ${dogName} 🐾\nReturn here anytime:\n${dashUrl}`
                  )
                  return (
                    <div className="rounded-2xl border-2 px-4 py-4 text-center"
                      style={{ borderColor: 'oklch(0.88 0.06 196)', background: 'oklch(0.97 0.02 196)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: 'oklch(0.40 0.17 196)', fontFamily: 'var(--font-fredoka)' }}>
                        📌 Save your dashboard link
                      </p>
                      <p className="text-xs text-slate-500 mb-3" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Bookmark this page or send the link to yourself — you need it to log future walks
                      </p>
                      <a
                        href={`https://wa.me/?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm"
                        style={{ background: '#25D366', fontFamily: 'var(--font-fredoka)' }}
                      >
                        📲 Send link to myself on WhatsApp
                      </a>
                    </div>
                  )
                })()}

                <button
                  onClick={() => {
                    setPhase('idle')
                    setReportUrl(null)
                    setParentWaLink(null)
                    if (connections.length > 1) setShowPicker(true)
                  }}
                  className="w-full py-4 rounded-2xl font-bold text-lg text-white"
                  style={{ background: '#FF8C52', fontFamily: 'var(--font-fredoka)' }}
                >
                  Log another walk →
                </button>
              </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* ─── WALK HISTORY (shown in idle phase only) ─── */}
          {phase === 'idle' && (
            <div className="px-5 mt-6">
              <h2 className="text-base font-bold text-[#0A2F35] mb-3" style={{ fontFamily: 'var(--font-fredoka)' }}>
                Recent Walks{logs.length > 0 ? ` (${logs.length})` : ''}
              </h2>

              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-20" style={{ border: '1px solid rgba(226,220,200,0.6)' }} />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="bg-white rounded-2xl px-5 py-8 text-center" style={{ border: '1px solid rgba(226,220,200,0.6)' }}>
                  <p className="text-3xl mb-2">🐾</p>
                  <p className="text-sm text-slate-500" style={{ fontFamily: 'var(--font-nunito)' }}>
                    No walks logged yet. Tap Start Walk to begin your first walk with {dogName}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const moodOption = MOOD_OPTIONS.find((m) => m.value === log.mood)
                    const statParts: string[] = []
                    if (log.distance_km != null && log.distance_km > 0) statParts.push(`${log.distance_km} km`)
                    if (log.poop_count > 0) statParts.push(`💩 ${log.poop_count} potty`)
                    if (log.pee_count > 0) statParts.push(`💧 ${log.pee_count} toilet`)
                    return (
                      <div key={log.id} className="bg-white rounded-2xl px-4 py-4" style={{ border: '1px solid rgba(226,220,200,0.6)' }}>
                        {/* Title row: duration left, date right */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p style={{ fontFamily: 'var(--font-fredoka)', fontSize: 14, fontWeight: 700, color: '#0A2F35', margin: 0 }}>
                            {log.duration_mins ? `${log.duration_mins} min walk` : 'Walk'}
                          </p>
                          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94A3B8', flexShrink: 0 }}>
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        {/* Stats line — only non-zero values */}
                        {statParts.length > 0 && (
                          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94A3B8', margin: '0 0 4px' }}>
                            {statParts.join(' · ')}
                          </p>
                        )}
                        {/* Mood */}
                        {moodOption && (
                          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#94A3B8', margin: '0 0 4px' }}>
                            {moodOption.emoji} {moodOption.label}
                          </p>
                        )}
                        {/* Report confirmation */}
                        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#CBD5E1', margin: 0 }}>
                          ✅ Report sent to {ownerFirstName}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Bookmark hint */}
              <div className="mt-6 rounded-2xl bg-[#0A2F35] bg-opacity-5 border border-[#0A2F35] border-opacity-10 px-4 py-3 text-center">
                <p className="text-xs text-[#0D3D45] font-medium">📌 Bookmark this page — it&apos;s your permanent walk log</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── SETTINGS TAB ─── */}
      {activeTab === 'settings' && (
        <SettingsTab
          token={token}
          walkerName={walkerName}
          walkerPhone={walkerPhone}
          walkerRole={walkerRole}
          dogName={dogName}
          dogBreed={dogBreed}
          dogPhotoUrl={dogPhotoUrl}
          healthNotes={healthNotes}
          ownerFirstName={ownerFirstName}
          ownerPhone={ownerPhone}
          careFocus={careFocus}
          showToast={(msg) => {
            setToast(msg)
            setTimeout(() => setToast(null), 3000)
          }}
          addClientOtp={addClientOtp}
          setAddClientOtp={setAddClientOtp}
          addClientLoading={addClientLoading}
          setAddClientLoading={setAddClientLoading}
          addClientSuccess={addClientSuccess}
          setAddClientSuccess={setAddClientSuccess}
          addClientError={addClientError}
          setAddClientError={setAddClientError}
        />
      )}

      {/* ─── BOTTOM NAV ─── */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t flex"
        style={{
          borderColor: 'oklch(0.906 0.06 88)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 40,
        }}
      >
        {(
          [
            { tab: 'walk' as WalkerTab, icon: '🐾', label: 'Walk' },
            { tab: 'settings' as WalkerTab, icon: '⚙️', label: 'Settings' },
          ] as const
        ).map(({ tab, icon, label }) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors"
          >
            <span
              className={`flex flex-col items-center justify-center rounded-full px-4 py-1.5 gap-0.5 transition-all ${
                activeTab === tab ? 'bg-teal-50' : ''
              }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span
                className={`text-[11px] font-bold leading-none ${
                  activeTab === tab ? 'text-[oklch(0.48_0.17_196)]' : 'text-slate-400'
                }`}
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {label}
              </span>
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
