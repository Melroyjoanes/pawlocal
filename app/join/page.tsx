'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, JUHU_CENTER } from '@/lib/categories'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'

export default function JoinPage() {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [pin, setPin] = useState(JUHU_CENTER)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    business_name: '',
    category_slug: 'dog-walking',
    whatsapp: '',
    phone: '',
    address: '',
    price_min: '',
    price_max: '',
    price_unit: 'per session',
    hours_from: '09:00',
    hours_to: '18:00',
    bio: '',
  })

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3)
    if (!files.length) return
    setUploading(true)
    const supabase = createClient()
    const urls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('provider-photos').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('provider-photos').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    setPhotoUrls((prev) => [...prev, ...urls].slice(0, 3))
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        lat: pin.lat,
        lng: pin.lng,
        photo_urls: photoUrls,
      }),
    })
    setSubmitting(false)
    if (res.ok) setStep('success')
  }

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">You're in the queue!</h1>
        <p className="text-gray-500">
          We'll review your listing and WhatsApp you at{' '}
          <strong>{form.whatsapp}</strong> within 24 hours once you're live.
        </p>
        <a href="/" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">
          ← Back to home
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">List your service</h1>
      <p className="text-gray-400 text-sm mb-8">
        Free forever. Takes 5 minutes. We'll review and go live within 24 hours.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Your name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Ravi Kumar"
          />
        </div>

        {/* Business name */}
        <div>
          <label className="block text-sm font-medium mb-1">Business name (optional)</label>
          <input
            value={form.business_name}
            onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Ravi's Dog Walk"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">Service type *</label>
          <select
            required
            value={form.category_slug}
            onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium mb-1">WhatsApp number *</label>
          <input
            required
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="98765 43210"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium mb-1">Phone (optional)</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="98765 43210"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium mb-1">Your address / area *</label>
          <input
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Juhu Tara Road, Juhu, Mumbai"
          />
        </div>

        {/* Pin on map */}
        <div>
          <label className="block text-sm font-medium mb-1">Pin your location *</label>
          <p className="text-xs text-gray-400 mb-2">Click on the map to set your exact location</p>
          <div className="h-52 rounded-xl overflow-hidden border">
            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
              <Map
                defaultCenter={JUHU_CENTER}
                defaultZoom={15}
                mapId="join-map"
                className="w-full h-full"
                gestureHandling="greedy"
                onClick={(e) => {
                  if (e.detail.latLng) setPin(e.detail.latLng)
                }}
              >
                <AdvancedMarker position={pin} />
              </Map>
            </APIProvider>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Min price (₹)</label>
            <input
              type="number"
              value={form.price_min}
              onChange={(e) => setForm({ ...form, price_min: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max price (₹)</label>
            <input
              type="number"
              value={form.price_max}
              onChange={(e) => setForm({ ...form, price_max: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="600"
            />
          </div>
        </div>

        {/* Hours */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Opens at</label>
            <input
              type="time"
              value={form.hours_from}
              onChange={(e) => setForm({ ...form, hours_from: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Closes at</label>
            <input
              type="time"
              value={form.hours_to}
              onChange={(e) => setForm({ ...form, hours_to: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium mb-1">Short bio (max 200 chars)</label>
          <textarea
            maxLength={200}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            rows={3}
            placeholder="I've walked 50+ dogs in Juhu for 3 years. Trained in basic pet first aid."
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{form.bio.length}/200</p>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium mb-1">Photos (up to 3)</label>
          <p className="text-xs text-gray-400 mb-2">First photo will be your profile picture</p>
          <div className="flex gap-3 flex-wrap">
            {photoUrls.map((url, i) => (
              <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {photoUrls.length < 3 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-2xl hover:border-gray-400 transition"
              >
                {uploading ? '...' : '+'}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full bg-black text-white py-4 rounded-2xl font-semibold text-base hover:bg-gray-800 transition disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : "Submit for review — it's free"}
        </button>

        <p className="text-xs text-center text-gray-400">
          We review every listing manually. You'll hear from us on WhatsApp within 24 hours.
        </p>
      </form>
    </div>
  )
}
