'use client'

export const TICK_ZONES = [
  { id: 'left_ear',      label: 'Left Ear'   },
  { id: 'right_ear',     label: 'Right Ear'  },
  { id: 'neck',          label: 'Neck'       },
  { id: 'back',          label: 'Back'       },
  { id: 'belly',         label: 'Belly'      },
  { id: 'armpits',       label: 'Armpits'    },
  { id: 'groin',         label: 'Groin'      },
  { id: 'base_of_tail',  label: 'Tail Base'  },
  { id: 'between_toes',  label: 'Paws'       },
] as const

export type TickZoneId = (typeof TICK_ZONES)[number]['id']

// 14 clickable hit areas across the 9 zones (bilateral zones have 2-4 areas)
const CLICK_AREAS: { zoneId: TickZoneId; cx: number; cy: number; rx: number; ry: number }[] = [
  { zoneId: 'left_ear',     cx: 38,  cy: 58,  rx: 24, ry: 30 },
  { zoneId: 'right_ear',    cx: 142, cy: 58,  rx: 24, ry: 30 },
  { zoneId: 'neck',         cx: 90,  cy: 97,  rx: 26, ry: 12 },
  { zoneId: 'back',         cx: 90,  cy: 148, rx: 40, ry: 26 },
  { zoneId: 'belly',        cx: 90,  cy: 196, rx: 38, ry: 22 },
  { zoneId: 'armpits',      cx: 50,  cy: 128, rx: 15, ry: 15 }, // left
  { zoneId: 'armpits',      cx: 130, cy: 128, rx: 15, ry: 15 }, // right
  { zoneId: 'groin',        cx: 52,  cy: 204, rx: 15, ry: 15 }, // left
  { zoneId: 'groin',        cx: 128, cy: 204, rx: 15, ry: 15 }, // right
  { zoneId: 'base_of_tail', cx: 90,  cy: 250, rx: 18, ry: 20 },
  { zoneId: 'between_toes', cx: 42,  cy: 155, rx: 14, ry: 11 }, // front left paw
  { zoneId: 'between_toes', cx: 138, cy: 155, rx: 14, ry: 11 }, // front right paw
  { zoneId: 'between_toes', cx: 44,  cy: 226, rx: 14, ry: 11 }, // back left paw
  { zoneId: 'between_toes', cx: 136, cy: 226, rx: 14, ry: 11 }, // back right paw
]

// Representative center per zone for tick dot rendering
const ZONE_CENTERS: Record<TickZoneId, { cx: number; cy: number }[]> = {
  left_ear:     [{ cx: 38,  cy: 58  }],
  right_ear:    [{ cx: 142, cy: 58  }],
  neck:         [{ cx: 90,  cy: 97  }],
  back:         [{ cx: 90,  cy: 148 }],
  belly:        [{ cx: 90,  cy: 196 }],
  armpits:      [{ cx: 50,  cy: 128 }, { cx: 130, cy: 128 }],
  groin:        [{ cx: 52,  cy: 204 }, { cx: 128, cy: 204 }],
  base_of_tail: [{ cx: 90,  cy: 250 }],
  between_toes: [
    { cx: 42,  cy: 155 },
    { cx: 138, cy: 155 },
    { cx: 44,  cy: 226 },
    { cx: 136, cy: 226 },
  ],
}

type Props = {
  selected: TickZoneId[]
  onChange?: (zones: TickZoneId[]) => void
  mode?: 'edit' | 'view'
  size?: number
}

// Paw pad helper — 4 dots in a 2×2 grid around cx,cy
function PawPads({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx - 4} cy={cy - 4} r="2.5" fill="#DEB86A" opacity="0.45" />
      <circle cx={cx + 4} cy={cy - 4} r="2.5" fill="#DEB86A" opacity="0.45" />
      <circle cx={cx - 4} cy={cy + 4} r="2.5" fill="#DEB86A" opacity="0.45" />
      <circle cx={cx + 4} cy={cy + 4} r="2.5" fill="#DEB86A" opacity="0.45" />
      <circle cx={cx}     cy={cy - 8} r="2"   fill="#DEB86A" opacity="0.35" />
    </>
  )
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

  // SVG native size — scale to `size` prop
  const VB_W = 180
  const VB_H = 270
  const svgH = Math.round((VB_H / VB_W) * size)

  const BODY_FILL    = '#FEF9EC'
  const EAR_FILL     = '#FDE68A'
  const STROKE       = '#DEB86A'
  const DARK         = '#7C5321'
  const SEL_FILL     = 'rgba(240,112,48,0.48)'
  const SEL_STROKE   = '#E05818'
  const HINT_STROKE  = 'rgba(222,184,106,0.35)'

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={size}
      height={svgH}
      style={{ display: 'block', overflow: 'visible' }}
      aria-label="Dog body diagram for marking tick locations"
    >
      <defs>
        {/* Soft drop shadow for body */}
        <filter id="dogShadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#DEB86A" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* ── SILHOUETTE ────────────────────────────────────────────────── */}

      {/* Body — chest-waist-hip profile */}
      <path
        d="
          M 62 102
          C 44 108, 40 128, 40 152
          C 40 172, 42 190, 48 208
          C 55 224, 68 232, 90 234
          C 112 232, 125 224, 132 208
          C 138 190, 140 172, 140 152
          C 140 128, 136 108, 118 102
          C 108 98, 72 98, 62 102
          Z
        "
        fill={BODY_FILL}
        stroke={STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#dogShadow)"
      />

      {/* Head */}
      <circle cx="90" cy="54" r="36" fill={BODY_FILL} stroke={STROKE} strokeWidth="2" />

      {/* Left ear — large droopy floppy */}
      <path
        d="
          M 60 34
          C 42 20, 20 36, 22 66
          C 23 88, 42 96, 58 82
          C 70 68, 72 50, 60 34
          Z
        "
        fill={EAR_FILL}
        stroke={STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Right ear — mirror */}
      <path
        d="
          M 120 34
          C 138 20, 160 36, 158 66
          C 157 88, 138 96, 122 82
          C 110 68, 108 50, 120 34
          Z
        "
        fill={EAR_FILL}
        stroke={STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Neck connector */}
      <path
        d="M 64 88 Q 90 82, 116 88 L 118 102 Q 90 97, 62 102 Z"
        fill={BODY_FILL}
        stroke={STROKE}
        strokeWidth="1.5"
      />

      {/* Front left leg */}
      <ellipse cx="44" cy="138" rx="14" ry="23"
        fill={BODY_FILL} stroke={STROKE} strokeWidth="2"
        transform="rotate(-6 44 138)" />

      {/* Front right leg */}
      <ellipse cx="136" cy="138" rx="14" ry="23"
        fill={BODY_FILL} stroke={STROKE} strokeWidth="2"
        transform="rotate(6 136 138)" />

      {/* Back left leg */}
      <ellipse cx="46" cy="210" rx="14" ry="23"
        fill={BODY_FILL} stroke={STROKE} strokeWidth="2"
        transform="rotate(5 46 210)" />

      {/* Back right leg */}
      <ellipse cx="134" cy="210" rx="14" ry="23"
        fill={BODY_FILL} stroke={STROKE} strokeWidth="2"
        transform="rotate(-5 134 210)" />

      {/* Tail */}
      <ellipse cx="90" cy="256" rx="9" ry="18"
        fill={EAR_FILL} stroke={STROKE} strokeWidth="2" />

      {/* ── DETAILS ───────────────────────────────────────────────────── */}

      {/* Snout area */}
      <ellipse cx="90" cy="78" rx="16" ry="12"
        fill="#FEF3C7" stroke={STROKE} strokeWidth="1.5" />

      {/* Nose */}
      <ellipse cx="90" cy="28" rx="7" ry="5" fill={DARK} />

      {/* Eyes */}
      <circle cx="74" cy="50" r="3.5" fill={DARK} />
      <circle cx="106" cy="50" r="3.5" fill={DARK} />
      {/* Eye shine */}
      <circle cx="76" cy="49" r="1.2" fill="white" />
      <circle cx="108" cy="49" r="1.2" fill="white" />

      {/* Spine dots */}
      {[130, 152, 174, 196].map(y => (
        <circle key={y} cx="90" cy={y} r="2.5" fill={STROKE} opacity="0.28" />
      ))}

      {/* Paw pads */}
      <PawPads cx={44}  cy={153} />
      <PawPads cx={136} cy={153} />
      <PawPads cx={46}  cy={224} />
      <PawPads cx={134} cy={224} />

      {/* Ear inner crease lines */}
      <path d="M 42 48 Q 38 62, 40 76"
        fill="none" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <path d="M 138 48 Q 142 62, 140 76"
        fill="none" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />

      {/* ── ZONE HIT AREAS ────────────────────────────────────────────── */}
      {CLICK_AREAS.map((area, i) => {
        const isSelected = selected.includes(area.zoneId)
        return (
          <ellipse
            key={i}
            cx={area.cx}
            cy={area.cy}
            rx={area.rx}
            ry={area.ry}
            fill={isSelected ? SEL_FILL : 'transparent'}
            stroke={isSelected ? SEL_STROKE : mode === 'edit' ? HINT_STROKE : 'none'}
            strokeWidth={isSelected ? 1.5 : 1}
            strokeDasharray={!isSelected && mode === 'edit' ? '3 2' : undefined}
            onClick={() => toggle(area.zoneId)}
            style={{
              cursor: mode === 'edit' ? 'pointer' : 'default',
              touchAction: 'manipulation',
            }}
          />
        )
      })}

      {/* ── TICK DOT MARKERS ─────────────────────────────────────────── */}
      {selected.flatMap(zoneId =>
        (ZONE_CENTERS[zoneId] ?? []).map((pt, i) => (
          <g key={`${zoneId}-${i}`}>
            {/* Glow ring */}
            <circle cx={pt.cx} cy={pt.cy} r="9"
              fill={SEL_STROKE} opacity="0.18" />
            {/* Dot */}
            <circle cx={pt.cx} cy={pt.cy} r="5.5"
              fill={SEL_STROKE} stroke="white" strokeWidth="1.5" />
            {/* 🕷 indicator — rendered as text (SVG emoji) */}
            <text x={pt.cx} y={pt.cy + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="7" style={{ userSelect: 'none', pointerEvents: 'none' }}>
              ✕
            </text>
          </g>
        ))
      )}

      {/* ── EDIT HINT ─────────────────────────────────────────────────── */}
      {mode === 'edit' && selected.length === 0 && (
        <text x="90" y="264" textAnchor="middle"
          fontSize="8.5" fill={STROKE}
          fontFamily="system-ui, -apple-system, sans-serif"
          opacity="0.7">
          tap zones where ticks were found
        </text>
      )}
    </svg>
  )
}
