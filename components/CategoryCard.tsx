import Link from 'next/link'
import type { CategoryConfig } from '@/lib/categories'

interface Props {
  category: CategoryConfig
  count?: number
}

export default function CategoryCard({ category, count }: Props) {
  const isInsurance = category.slug === 'insurance'

  return (
    <Link
      href={`/${category.slug}`}
      className="group flex items-center gap-4 bg-white p-4 rounded-2xl border border-border hover:border-[var(--pl-teal)] hover:shadow-sm transition-all"
    >
      {/* Icon swatch */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-105"
        style={{ backgroundColor: category.color + '18' }}
      >
        {category.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground leading-snug">{category.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{category.tagline}</p>
      </div>

      {/* Count or action */}
      <div className="flex-shrink-0 text-right">
        {isInsurance ? (
          <span className="text-xs font-medium" style={{ color: 'var(--pl-teal)' }}>
            Compare →
          </span>
        ) : count !== undefined && count > 0 ? (
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: category.color + '14', color: category.color }}
          >
            {count}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Soon</span>
        )}
      </div>
    </Link>
  )
}
