import { createClient } from '@/lib/supabase/server'
import CategoryCard from '@/components/CategoryCard'
import { CATEGORIES } from '@/lib/categories'

export default async function HomePage() {
  const supabase = await createClient()

  // Count approved providers per category
  const { data: counts } = await supabase
    .from('providers')
    .select('category_slug')
    .eq('status', 'approved') as { data: { category_slug: string }[] | null }

  const countMap: Record<string, number> = {}
  counts?.forEach((row) => {
    countMap[row.category_slug] = (countMap[row.category_slug] ?? 0) + 1
  })

  const totalProviders = Object.values(countMap).reduce((a, b) => a + b, 0)

  return (
    <div>
      {/* Hero */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
          🐾 Juhu &amp; surroundings · {totalProviders > 0 ? `${totalProviders} verified providers` : 'New — adding providers now'}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          The best pet services<br />
          near <span className="text-indigo-600">Juhu, Mumbai</span>
        </h1>
        <p className="text-gray-500 mt-3 text-lg">
          Dog walkers, groomers, vets, stores, and insurance — all in one place. Every listing is reviewed by us.
        </p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.slug}
            category={category}
            count={countMap[category.slug] ?? 0}
          />
        ))}
      </div>

      {/* How it works */}
      <div className="mb-12">
        <h2 className="text-lg font-bold text-gray-900 mb-4">How PawLocal works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', icon: '🔍', title: 'Browse by service', desc: 'Pick dog walking, grooming, vet, or a store near you.' },
            { step: '2', icon: '📍', title: 'Find on the map', desc: 'See exactly where each provider is — toggle list or map view.' },
            { step: '3', icon: '💬', title: 'WhatsApp directly', desc: 'One tap to contact them. No middleman, no booking fee.' },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
              <div className="text-2xl flex-shrink-0">{icon}</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provider CTA */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">Are you a pet service provider?</p>
          <p className="text-sm text-gray-500">Get listed for free. Reach pet owners in Juhu &amp; nearby areas.</p>
        </div>
        <a
          href="/join"
          className="bg-black text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition whitespace-nowrap"
        >
          List your service — it&apos;s free
        </a>
      </div>
    </div>
  )
}
