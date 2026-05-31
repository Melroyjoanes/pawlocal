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

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          Pet services near <span className="text-indigo-600">Juhu, Mumbai</span>
        </h1>
        <p className="text-gray-500 mt-2">
          Find trusted dog walkers, groomers, vets, and more — all verified locally.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.slug}
            category={category}
            count={countMap[category.slug] ?? 0}
          />
        ))}
      </div>
      <div className="mt-12 bg-gray-50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">Are you a pet service provider?</p>
          <p className="text-sm text-gray-500">Get listed for free. Reach pet owners in Juhu.</p>
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
