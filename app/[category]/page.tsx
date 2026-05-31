'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCategoryBySlug } from '@/lib/categories'
import type { ProviderWithPhotos } from '@/lib/supabase/types'
import ProviderCard from '@/components/ProviderCard'
import dynamic from 'next/dynamic'

const ProviderMap = dynamic(() => import('@/components/ProviderMap'), { ssr: false })

export default function CategoryPage() {
  const params = useParams()
  const slug = params.category as string
  const category = getCategoryBySlug(slug)

  const [providers, setProviders] = useState<ProviderWithPhotos[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!category) return
    const supabase = createClient()
    supabase
      .from('providers')
      .select('*, provider_photos(*)')
      .eq('category_slug', slug)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProviders((data as ProviderWithPhotos[]) ?? [])
        setLoading(false)
      })
  }, [slug, category])

  if (!category) {
    return <div className="py-20 text-center text-gray-400">Category not found.</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{category.icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          <p className="text-sm text-gray-400">{category.tagline} · Juhu, Mumbai</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-5">
        {(['list', 'map'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              view === v
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {v === 'list' ? '☰ List' : '🗺 Map'}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400 self-center">
          {providers.length} provider{providers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading...</div>
      ) : providers.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-gray-400 mb-4">No providers listed yet in this area.</p>
          <a href="/join" className="text-sm font-medium text-indigo-600 hover:underline">
            Be the first to list →
          </a>
        </div>
      ) : view === 'list' ? (
        <div className="flex flex-col gap-3">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} category={category} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4" style={{ height: '600px' }}>
          <div className="flex-1 min-h-0">
            <ProviderMap
              providers={providers}
              category={category}
              onSelectProvider={setSelectedId}
              selectedId={selectedId}
            />
          </div>
          <div className="lg:w-72 overflow-y-auto flex flex-col gap-3 pr-1">
            {providers
              .sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : 0))
              .map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`cursor-pointer rounded-xl transition ${
                    selectedId === p.id ? 'ring-2 ring-black' : ''
                  }`}
                >
                  <ProviderCard provider={p} category={category} />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
