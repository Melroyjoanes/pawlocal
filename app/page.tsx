import { createClient } from '@/lib/supabase/server'
import CategoryCard from '@/components/CategoryCard'
import { CATEGORIES } from '@/lib/categories'

export default async function HomePage() {
  const supabase = await createClient()

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
      <div className="mb-11">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full mb-5 border"
          style={{
            backgroundColor: 'var(--pl-teal-light)',
            borderColor: 'oklch(0.88 0.07 196)',
            color: 'var(--pl-teal)',
          }}
        >
          📍 Juhu, Mumbai
          {totalProviders > 0 && (
            <span className="opacity-70">· {totalProviders} services listed</span>
          )}
        </div>

        <h1
          className="text-4xl sm:text-5xl leading-tight text-foreground mb-3 font-display"
        >
          Pet care you can trust.
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg">
          Every walker, groomer, vet, and store on PawLocal is reviewed before going live. Browse, compare, and WhatsApp directly.
        </p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-14">
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.slug}
            category={category}
            count={countMap[category.slug] ?? 0}
          />
        ))}
      </div>

      {/* How it works */}
      <div className="mb-14">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-5">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              n: '01',
              title: 'Browse by category',
              desc: 'Pick the service you need — walking, grooming, vet, store, or insurance.',
            },
            {
              n: '02',
              title: 'Compare on the map',
              desc: 'See every provider near you. Toggle between list and map view.',
            },
            {
              n: '03',
              title: 'WhatsApp directly',
              desc: 'One tap to contact them. No booking fee, no middleman.',
            },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex gap-4">
              <span
                className="text-2xl font-display leading-none pt-0.5 flex-shrink-0"
                style={{ color: 'var(--pl-teal)' }}
              >
                {n}
              </span>
              <div>
                <p className="font-semibold text-foreground text-sm">{title}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provider CTA */}
      <div className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border border-border"
        style={{ backgroundColor: 'var(--pl-teal-light)' }}
      >
        <div>
          <p className="font-semibold text-foreground text-base">Are you a pet service provider?</p>
          <p className="text-sm text-muted-foreground mt-1">
            Get listed for free. Every listing is reviewed by our team before going live.
          </p>
        </div>
        <a
          href="/join"
          className="flex-shrink-0 text-sm font-medium px-5 py-2.5 rounded-full transition-colors bg-[var(--pl-teal)] text-white hover:bg-[var(--pl-teal-hover)] whitespace-nowrap"
        >
          List your service — it&apos;s free
        </a>
      </div>
    </div>
  )
}
