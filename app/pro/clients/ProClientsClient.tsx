'use client'

import { useState, useEffect } from 'react'

type Client = {
  id: string
  pet_name: string
  owner_name: string | null
  owner_whatsapp: string
  owner_user_id: string | null
  invite_token: string
  invite_status: 'pending' | 'accepted'
  linked_at: string | null
  created_at: string
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function buildWaLink(token: string, petName: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteUrl = `${base}/join?token=${token}`
  const msg = `Hi! Your dog walker/groomer has invited you to PawLocal to receive walk reports and updates for ${petName}. Tap here to get started: ${inviteUrl}`
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}

export default function ProClientsClient() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add client form
  const [showForm, setShowForm] = useState(false)
  const [petName, setPetName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerWhatsapp, setOwnerWhatsapp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Post-add WhatsApp share
  const [freshLink, setFreshLink] = useState<string | null>(null)
  const [freshPetName, setFreshPetName] = useState<string>('')
  const [showShareFor, setShowShareFor] = useState(0) // countdown seconds

  useEffect(() => {
    fetch('/api/pro/clients')
      .then(r => r.json())
      .then(data => { setClients(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setError('Could not load clients.'); setLoading(false) })
  }, [])

  // Countdown timer for WhatsApp share button
  useEffect(() => {
    if (showShareFor <= 0) return
    const t = setTimeout(() => setShowShareFor(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [showShareFor])

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    if (!petName.trim()) { setFormError("Dog's name is required."); return }
    if (!ownerWhatsapp.trim()) { setFormError("Owner's WhatsApp number is required."); return }
    setFormError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/pro/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_name: petName.trim(), owner_name: ownerName.trim() || null, owner_whatsapp: ownerWhatsapp.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to add client')
      setClients(prev => [data.client, ...prev])
      setFreshLink(data.whatsapp_link)
      setFreshPetName(petName.trim())
      setShowShareFor(10)
      setShowForm(false)
      setPetName('')
      setOwnerName('')
      setOwnerWhatsapp('')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleResend(client: Client) {
    const link = buildWaLink(client.invite_token, client.pet_name)
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-dvh pb-24" style={{ background: '#FFFBEB', fontFamily: 'var(--font-nunito, Nunito, sans-serif)' }}>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-fredoka, Fredoka, sans-serif)', color: '#0A2F35' }}
          >
            My Clients
          </h1>
          {!loading && clients.length > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">

        {/* Add client button + inline form */}
        <div className="mb-5">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:opacity-90"
              style={{ background: '#FF8C52' }}
            >
              <span className="text-base">+</span> Add a client
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
              <h2 className="font-bold text-base mb-4" style={{ color: '#0A2F35' }}>Add a new client</h2>
              <form onSubmit={handleAddClient} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-500 uppercase tracking-wide">
                    Dog&apos;s name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={petName}
                    onChange={e => setPetName(e.target.value)}
                    placeholder="e.g. Bruno"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-stone-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-500 uppercase tracking-wide">
                    Owner&apos;s name <span className="text-stone-300 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-500 uppercase tracking-wide">
                    Owner&apos;s WhatsApp <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={ownerWhatsapp}
                    onChange={e => setOwnerWhatsapp(e.target.value)}
                    placeholder="91XXXXXXXXXX"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-stone-50"
                    required
                  />
                </div>
                {formError && (
                  <p className="text-xs text-red-500 font-medium">{formError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:opacity-90 disabled:opacity-60"
                    style={{ background: '#0A2F35' }}
                  >
                    {submitting ? 'Adding…' : 'Add client →'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setFormError(null) }}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-stone-500 border border-stone-200 bg-white transition-all active:opacity-70"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Post-add WhatsApp share button (10s) */}
        {freshLink && showShareFor > 0 && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-emerald-800">Client added!</p>
              <p className="text-xs text-emerald-600">Send {freshPetName}&apos;s invite on WhatsApp now</p>
            </div>
            <a
              href={freshLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap transition-all active:opacity-90"
              style={{ background: '#25D366' }}
            >
              📲 Send invite <span className="opacity-70 text-xs">({showShareFor}s)</span>
            </a>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-stone-100 p-5 animate-pulse">
                <div className="h-4 bg-stone-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && clients.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-10 text-center mt-2">
            <div className="text-5xl mb-4">🐾</div>
            <h2 className="text-base font-bold mb-2" style={{ color: '#0A2F35' }}>No clients yet</h2>
            <p className="text-sm text-stone-400 leading-relaxed">
              Add your first client below to start sending them walk reports.
            </p>
          </div>
        )}

        {/* Client list */}
        {!loading && !error && clients.length > 0 && (
          <div className="space-y-3">
            {clients.map(client => {
              const accepted = client.invite_status === 'accepted'
              return (
                <div
                  key={client.id}
                  className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-center gap-3"
                >
                  {/* Left: dog info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-lg leading-none">🐶</span>
                      <span className="font-bold text-sm truncate" style={{ color: '#0A2F35' }}>
                        {client.pet_name}
                      </span>
                    </div>
                    {client.owner_name && (
                      <p className="text-xs text-stone-500 ml-7 truncate">{client.owner_name}</p>
                    )}
                    <p className="text-xs text-stone-400 ml-7 mt-0.5">{client.owner_whatsapp}</p>
                    <p className="text-xs text-stone-300 ml-7 mt-0.5">Added {formatDate(client.created_at)}</p>
                  </div>

                  {/* Right: status + action */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {accepted ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        ✓ Connected
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                          Invite sent
                        </span>
                        <button
                          onClick={() => handleResend(client)}
                          className="text-xs font-bold text-teal-700 underline underline-offset-2 active:opacity-60"
                        >
                          Resend
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
