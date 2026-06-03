'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProviderWithPhotos, Review } from '@/lib/supabase/types'
import { getCategoryBySlug } from '@/lib/categories'
import { Stars } from '@/components/StarRating'

type Filter = 'pending' | 'approved' | 'rejected'
type Tab = 'providers' | 'reviews'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('providers')
  const [providers, setProviders] = useState<ProviderWithPhotos[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<(Review & { provider_name?: string })[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  async function loadProviders(status: Filter) {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('providers')
      .select('*, provider_photos(*)')
      .eq('status', status)
      .order('created_at', { ascending: false })
    setProviders((data as unknown as ProviderWithPhotos[]) ?? [])
    setLoading(false)
  }

  async function loadReviews() {
    setReviewsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('reviews')
      .select('*, providers(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (data ?? []).map((r: any) => ({ ...r, provider_name: r.providers?.name }))
    setReviews(mapped)
    setReviewsLoading(false)
  }

  useEffect(() => { loadProviders(filter) }, [filter])
  useEffect(() => { if (tab === 'reviews') loadReviews() }, [tab])

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    await fetch(`/api/admin/providers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setProviders((prev) => prev.filter((p) => p.id !== id))
  }

  async function updateReview(id: string, status: 'approved' | 'rejected') {
    await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setReviews((prev) => prev.filter((r) => r.id !== id))
  }

  async function toggleVerified(id: string, current: boolean) {
    await fetch(`/api/admin/providers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_verified: !current }),
    })
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_verified: !current } : p))
    )
  }

  async function setVerificationTier(id: string, tier: string) {
    await fetch(`/api/admin/providers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_tier: tier }),
    })
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, verification_tier: tier } : p))
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← View site</a>
      </div>

      {/* Top-level tab: Providers / Reviews */}
      <div className="flex gap-2 mb-5 border-b border-border pb-3">
        {(['providers', 'reviews'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
              tab === t ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t === 'reviews' ? '⭐ Reviews' : '🏠 Providers'}
          </button>
        ))}
      </div>

      {/* Provider status tabs */}
      {tab === 'providers' && (
      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition ${
              filter === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      )}

      {/* ── Reviews panel ─────────────────────────────────────────── */}
      {tab === 'reviews' && (
        reviewsLoading ? (
          <div className="py-20 text-center text-gray-400">Loading reviews…</div>
        ) : reviews.length === 0 ? (
          <div className="py-20 text-center text-gray-400">No pending reviews 🎉</div>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm">{r.reviewer_name}</p>
                    <p className="text-xs text-gray-400">for <span className="font-medium text-gray-600">{r.provider_name}</span></p>
                  </div>
                  <div className="text-right">
                    <Stars rating={r.rating} size="sm" />
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-600 mb-3 bg-gray-50 rounded-lg p-3">&ldquo;{r.comment}&rdquo;</p>
                )}
                {r.reviewer_phone && (
                  <p className="text-xs text-gray-400 mb-3">📱 {r.reviewer_phone}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => updateReview(r.id, 'approved')}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition"
                  >
                    ✓ Publish
                  </button>
                  <button
                    onClick={() => updateReview(r.id, 'rejected')}
                    className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                  >
                    ✗ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Providers panel ───────────────────────────────────────── */}
      {tab === 'providers' && (loading ? (
        <div className="py-20 text-center text-gray-400">Loading...</div>
      ) : providers.length === 0 ? (
        <div className="py-20 text-center text-gray-400">No {filter} providers.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {providers.map((p) => {
            const category = getCategoryBySlug(p.category_slug)
            const primaryPhoto = p.provider_photos.find((ph) => ph.is_primary) ?? p.provider_photos[0]
            return (
              <div key={p.id} className="border rounded-xl p-4 flex gap-4 items-start">
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {primaryPhoto ? (
                    <img src={primaryPhoto.url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {category?.icon}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      {p.business_name && <p className="text-xs text-gray-400">{p.business_name}</p>}
                      <span className="text-xs text-gray-400">{category?.name} · {p.address}</span>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  {p.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.bio}</p>}
                  <div className="flex gap-2 mt-3 text-sm">
                    <span className="text-gray-500">📱 {p.whatsapp}</span>
                    {p.price_min && <span className="text-gray-500">· ₹{p.price_min}–{p.price_max}</span>}
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {filter === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(p.id, 'approved')}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => updateStatus(p.id, 'rejected')}
                          className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {filter === 'approved' && (
                      <>
                        <button
                          onClick={() => toggleVerified(p.id, p.is_verified)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            p.is_verified
                              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {p.is_verified ? '✓ Verified — click to remove' : '☆ Mark as Verified'}
                        </button>
                        <select
                          value={p.verification_tier ?? 'contacted'}
                          onChange={(e) => setVerificationTier(p.id, e.target.value)}
                          className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                        >
                          <option value="contacted">Tier: Listed</option>
                          <option value="verified">Tier: Verified</option>
                          <option value="certified">Tier: Certified</option>
                        </select>
                      </>
                    )}
                    <a
                      href={`https://wa.me/91${p.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                    >
                      💬 WhatsApp
                    </a>
                    <a
                      href={`/provider/${p.id}`}
                      target="_blank"
                      className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                    >
                      👁 View
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
