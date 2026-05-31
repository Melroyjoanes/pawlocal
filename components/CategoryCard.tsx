import Link from 'next/link'
import type { CategoryConfig } from '@/lib/categories'

interface Props {
  category: CategoryConfig
  count?: number
}

export default function CategoryCard({ category, count }: Props) {
  return (
    <Link
      href={`/${category.slug}`}
      className={`${category.bgColor} rounded-2xl p-6 flex flex-col gap-3 hover:scale-[1.02] transition-transform cursor-pointer border border-transparent hover:border-gray-200`}
    >
      <span className="text-4xl">{category.icon}</span>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{category.tagline}</p>
      </div>
      {count !== undefined && (
        <span
          className="text-xs font-medium px-2 py-1 rounded-full w-fit"
          style={{ backgroundColor: category.color + '20', color: category.color }}
        >
          {count} listed
        </span>
      )}
    </Link>
  )
}
