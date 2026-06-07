import Link from 'next/link'
import type { CategoryConfig } from '@/lib/categories'

interface Props {
  category: CategoryConfig
  count?: number
}

// Per-category soft gradient backgrounds — sunshine palette
const CAT_GRAD: Record<string, { bg: string; shadow: string; border: string }> = {
  'dog-walking': {
    bg: 'linear-gradient(145deg, #FEF9C3 0%, #FDE68A 100%)',         // lemon → amber
    shadow: 'inset 0 1.5px 0 rgba(255,255,255,0.92), inset 0 -3px 0 rgba(161,98,7,0.18), 0 10px 28px rgba(253,230,138,0.55)',
    border: '1px solid rgba(253,230,138,0.75)',
  },
  'grooming': {
    bg: 'linear-gradient(145deg, #F5F3FF 0%, #E9D5FF 100%)',          // lavender
    shadow: 'inset 0 1.5px 0 rgba(255,255,255,0.92), inset 0 -3px 0 rgba(109,40,217,0.16), 0 10px 28px rgba(233,213,255,0.55)',
    border: '1px solid rgba(233,213,255,0.7)',
  },
  'vet': {
    bg: 'linear-gradient(145deg, #FFF1F2 0%, #FECDD3 100%)',          // rose
    shadow: 'inset 0 1.5px 0 rgba(255,255,255,0.92), inset 0 -3px 0 rgba(159,18,57,0.14), 0 10px 28px rgba(254,205,211,0.55)',
    border: '1px solid rgba(254,205,211,0.7)',
  },
  'pet-store': {
    bg: 'linear-gradient(145deg, #F0FDF4 0%, #BBF7D0 100%)',          // mint
    shadow: 'inset 0 1.5px 0 rgba(255,255,255,0.92), inset 0 -3px 0 rgba(5,150,105,0.16), 0 10px 28px rgba(187,247,208,0.55)',
    border: '1px solid rgba(187,247,208,0.7)',
  },
  'dog-training': {
    bg: 'linear-gradient(145deg, #E0F2FE 0%, #BAE6FD 100%)',          // sky
    shadow: 'inset 0 1.5px 0 rgba(255,255,255,0.92), inset 0 -3px 0 rgba(8,145,178,0.18), 0 10px 28px rgba(186,230,253,0.5)',
    border: '1px solid rgba(186,230,253,0.7)',
  },
  'insurance': {
    bg: 'linear-gradient(145deg, #FEFCE8 0%, #FEF08A 100%)',          // lemon bright
    shadow: 'inset 0 1.5px 0 rgba(255,255,255,0.92), inset 0 -3px 0 rgba(161,98,7,0.14), 0 10px 28px rgba(254,240,138,0.55)',
    border: '1px solid rgba(254,240,138,0.7)',
  },
}

const DEFAULT_CARD = {
  bg: 'linear-gradient(145deg, #ffffff 0%, #fffdf7 100%)',
  shadow: 'inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -3px 0 rgba(0,0,0,0.08), 0 10px 28px rgba(15,45,50,0.09)',
  border: '1px solid rgba(226,220,200,0.7)',
}

export default function CategoryCard({ category, count }: Props) {
  const isInsurance = category.slug === 'insurance'
  const clay = CAT_GRAD[category.slug] ?? DEFAULT_CARD

  return (
    <Link
      href={`/${category.slug}`}
      className="group flex items-center gap-4 p-4 transition-all"
      style={{
        background: clay.bg,
        boxShadow: clay.shadow,
        border: clay.border,
        borderRadius: 24,
        transform: 'translateY(0)',
        transition: 'box-shadow 0.22s ease, transform 0.22s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-3px)'
        el.style.boxShadow = clay.shadow.replace('0 10px 28px', '0 18px 40px')
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = clay.shadow
      }}
    >
      {/* Icon swatch — white clay pill */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110"
        style={{
          background: 'linear-gradient(160deg, #ffffff 0%, #fffdf5 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -2px 0 rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.09)',
          border: '1px solid rgba(255,255,255,0.8)',
        }}
      >
        {category.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 leading-snug">{category.name}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{category.tagline}</p>
      </div>

      {/* Count or action */}
      <div className="flex-shrink-0 text-right">
        {isInsurance ? (
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: 'linear-gradient(160deg, #FEF3C7 0%, #FDE68A 100%)',
              color: '#78350F',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(253,230,138,0.5)',
              border: '1px solid rgba(253,230,138,0.6)',
            }}
          >
            Compare →
          </span>
        ) : count !== undefined && count > 0 ? (
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: category.color + '1a',
              color: category.color,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 8px ${category.color}28`,
              border: `1px solid ${category.color}30`,
            }}
          >
            {count}
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-400">Soon</span>
        )}
      </div>
    </Link>
  )
}
