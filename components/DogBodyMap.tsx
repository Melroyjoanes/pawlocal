'use client'

export const TICK_ZONES = [
  { id: 'left_ear',     label: 'Left Ear'  },
  { id: 'right_ear',   label: 'Right Ear' },
  { id: 'neck',        label: 'Neck'      },
  { id: 'back',        label: 'Back'      },
  { id: 'belly',       label: 'Belly'     },
  { id: 'armpits',     label: 'Armpits'   },
  { id: 'groin',       label: 'Groin'     },
  { id: 'base_of_tail',label: 'Tail Base' },
  { id: 'between_toes',label: 'Paws'      },
] as const

export type TickZoneId = (typeof TICK_ZONES)[number]['id']

// Each clickable area maps to a zone (bilateral zones have 2+ areas)
const CLICK_AREAS: { zoneId: TickZoneId; cx: number; cy: number; rx: number; ry: number }[] = [
  { zoneId: 'left_ear',     cx: 95,  cy: 50,  rx: 23, ry: 31 },
  { zoneId: 'right_ear',   cx: 165, cy: 50,  rx: 23, ry: 31 },
  { zoneId: 'neck',        cx: 130, cy: 112, rx: 27, ry: 18 },
  { zoneId: 'back',        cx: 130, cy: 162, rx: 46, ry: 27 },
  { zoneId: 'belly',       cx: 130, cy: 210, rx: 46, ry: 27 },
  { zoneId: 'armpits',     cx: 82,  cy: 152, rx: 19, ry: 17 },
  { zoneId: 'armpits',     cx: 178, cy: 152, rx: 19, ry: 17 },
  { zoneId: 'groin',       cx: 82,  cy: 245, rx: 19, ry: 17 },
  { zoneId: 'groin',       cx: 178, cy: 245, rx: 19, ry: 17 },
  { zoneId: 'base_of_tail',cx: 130, cy: 292, rx: 19, ry: 23 },
  { zoneId: 'between_toes',cx: 73,  cy: 170, rx: 15, ry: 12 },
  { zoneId: 'between_toes',cx: 187, cy: 170, rx: 15, ry: 12 },
  { zoneId: 'between_toes',cx: 74,  cy: 265, rx: 15, ry: 12 },
  { zoneId: 'between_toes',cx: 186, cy: 265, rx: 15, ry: 12 },
]

// One representative center per zone (for the tick marker in view mode)
const ZONE_CENTERS: Record<TickZoneId, { cx: number; cy: number }> = {
  left_ear:     { cx: 95,  cy: 50  },
  right_ear:    { cx: 165, cy: 50  },
  neck:         { cx: 130, cy: 112 },
  back:         { cx: 130, cy: 162 },
  belly:        { cx: 130, cy: 210 },
  armpits:      { cx: 130, cy: 152 },
  groin:        { cx: 130, cy: 245 },
  base_of_tail: { cx: 130, cy: 292 },
  between_toes: { cx: 130, cy: 218 }, // not used (between_toes uses paw areas)
}

type Props = {
  selected: TickZoneId[]
  onChange?: (zones: TickZoneId[]) => void
  mode?: 'edit' | 'view'
  size?: number
}

export default function DogBodyMap({ selected, onChange, mode = 'edit', size = 220 }: Props) {
  function toggle(zoneId: TickZoneId) {
    if (mode !== 'edit' || !onChange) return
    onChange(
      selected.includes(zoneId)
        ? selected.filter(z => z !== zoneId)
        : [...selected, zoneId],
    )
  }

  const scale = size / 260
  const height = Math.round(340 * scale)

  return (
    <svg
      viewBox="0 0 260 340"
      width={size}
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* ── Dog silhouette (top-down view) ── */}
      {/* Body */}
      <ellipse cx="130" cy="188" rx="60" ry="78" fill="#FEF9EC" stroke="#DEB86A" strokeWidth="2" />
      {/* Head */}
      <ellipse cx="130" cy="66" rx="32" ry="36" fill="#FEF9EC" stroke="#DEB86A" strokeWidth="2" />
      {/* Neck connector */}
      <path d="M 106,100 Q 130,93 154,100 L 157,122 Q 130,114 103,122 Z" fill="#FEF9EC" stroke="#DEB86A" strokeWidth="2" />
      {/* Left ear */}
      <ellipse cx="95" cy="50" rx="19" ry="27" fill="#FEF3C7" stroke="#DEB86A" strokeWidth="2" transform="rotate(-12,95,50)" />
      {/* Right ear */}
      <ellipse cx="165" cy="50" rx="19" ry="27" fill="#FEF3C7" stroke="#DEB86A" strokeWidth="2" transform="rotate(12,165,50)" />
      {/* Front left leg */}
      <ellipse cx="73" cy="152" rx="13" ry="25" fill="#FEF9EC" stroke="#DEB86A" strokeWidth="2" />
      {/* Front right leg */}
      <ellipse cx="187" cy="152" rx="13" ry="25" fill="#FEF9EC" stroke="#DEB86A" strokeWidth="2" />
      {/* Rear left leg */}
      <ellipse cx="74" cy="248" rx="13" ry="25" fill="#FEF9EC" stroke="#DEB86A" strokeWidth="2" />
      {/* Rear right leg */}
      <ellipse cx="186" cy="248" rx="13" ry="25" fill="#FEF9EC" stroke="#DEB86A" strokeWidth="2" />
      {/* Tail */}
      <ellipse cx="130" cy="296" rx="9" ry="20" fill="#FEF3C7" stroke="#DEB86A" strokeWidth="2" />
      {/* Nose */}
      <circle cx="130" cy="37" r="5" fill="#DEB86A" />
      {/* Spine dots */}
      {[140, 163, 186, 210, 234].map(y => (
        <circle key={y} cx="130" cy={y} r="2.5" fill="#DEB86A" opacity="0.3" />
      ))}

      {/* ── Clickable zone overlays ── */}
      {CLICK_AREAS.map((area, i) => {
        const isSelected = selected.includes(area.zoneId)
        return (
          <ellipse
            key={i}
            cx={area.cx}
            cy={area.cy}
            rx={area.rx}
            ry={area.ry}
            fill={isSelected ? 'rgba(240,112,48,0.55)' : 'transparent'}
            stroke={isSelected ? '#E05818' : 'rgba(222,184,106,0)'}
            strokeWidth={isSelected ? 1.5 : 0}
            onClick={() => toggle(area.zoneId)}
            style={{ cursor: mode === 'edit' ? 'pointer' : 'default' }}
          />
        )
      })}

      {/* ── Tick dot markers on selected zones (view + edit) ── */}
      {selected.map(zoneId => {
        // For between_toes show on all four paw areas
        if (zoneId === 'between_toes') {
          return CLICK_AREAS.filter(a => a.zoneId === 'between_toes').map((a, i) => (
            <circle key={`toes-${i}`} cx={a.cx} cy={a.cy} r="5" fill="#E05818" />
          ))
        }
        // For bilateral zones (armpits, groin) show on both sides
        const areas = CLICK_AREAS.filter(a => a.zoneId === zoneId)
        return areas.map((a, i) => (
          <circle key={`${zoneId}-${i}`} cx={a.cx} cy={a.cy} r="5" fill="#E05818" />
        ))
      })}

      {/* ── "Tap a zone" hint in edit mode when nothing selected ── */}
      {mode === 'edit' && selected.length === 0 && (
        <text x="130" y="328" textAnchor="middle" fontSize="9" fill="#DEB86A" fontFamily="system-ui,sans-serif">
          tap body zones where ticks were found
        </text>
      )}
    </svg>
  )
}
