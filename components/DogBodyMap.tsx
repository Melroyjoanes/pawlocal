'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

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

// SVG viewBox: 100 wide × 134 tall  ≈ 830:1110 image ratio
const VB_W = 100
const VB_H = 134

// Clickable hit areas — SVG coordinate space
const HIT_AREAS: { zoneId: TickZoneId; cx: number; cy: number; r: number }[] = [
  { zoneId: 'left_ear',     cx: 18,  cy: 14,  r: 10 },
  { zoneId: 'right_ear',    cx: 82,  cy: 14,  r: 10 },
  { zoneId: 'neck',         cx: 50,  cy: 30,  r: 8  },
  { zoneId: 'back',         cx: 50,  cy: 48,  r: 12 },
  { zoneId: 'belly',        cx: 50,  cy: 66,  r: 13 },
  { zoneId: 'armpits',      cx: 10,  cy: 46,  r: 9  },
  { zoneId: 'armpits',      cx: 90,  cy: 46,  r: 9  },
  { zoneId: 'groin',        cx: 50,  cy: 85,  r: 10 },
  { zoneId: 'base_of_tail', cx: 50,  cy: 122, r: 7  },
  { zoneId: 'between_toes', cx: 18,  cy: 107, r: 8  },
  { zoneId: 'between_toes', cx: 82,  cy: 107, r: 8  },
]

// Representative dot centers per zone
const MARKER_CENTERS: Record<TickZoneId, { cx: number; cy: number }[]> = {
  left_ear:     [{ cx: 18, cy: 14 }],
  right_ear:    [{ cx: 82, cy: 14 }],
  neck:         [{ cx: 50, cy: 30 }],
  back:         [{ cx: 50, cy: 48 }],
  belly:        [{ cx: 50, cy: 66 }],
  armpits:      [{ cx: 10, cy: 46 }, { cx: 90, cy: 46 }],
  groin:        [{ cx: 50, cy: 85 }],
  base_of_tail: [{ cx: 50, cy: 122 }],
  between_toes: [{ cx: 18, cy: 107 }, { cx: 82, cy: 107 }],
}

// Sparkle positions (% of container)
const SPARKLES = [
  { x:  8, y:  4, c: '✨' },
  { x: 92, y:  4, c: '✨' },
  { x:  2, y: 38, c: '🌿' },
  { x: 98, y: 38, c: '🌿' },
  { x: 50, y:  0, c: '⭐' },
  { x: 18, y: 92, c: '✨' },
  { x: 82, y: 92, c: '✨' },
  { x: 50, y: 97, c: '🌿' },
]

type Mood = 'happy' | 'mild' | 'sad' | 'distressed'

function getMood(n: number): Mood {
  if (n === 0) return 'happy'
  if (n <= 2)  return 'mild'
  if (n <= 5)  return 'sad'
  return 'distressed'
}

function markerFill(mood: Mood) {
  return mood === 'happy'      ? '#10B981'
    : mood === 'mild'          ? '#F59E0B'
    : mood === 'sad'           ? '#EF4444'
    : /* distressed */           '#DC2626'
}

// ── Animated tick marker dot (pops in when added in edit mode) ────────────────
function TickMarker({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  const gRef = useRef<SVGGElement>(null)

  useGSAP(() => {
    if (!gRef.current) return
    gsap.from(gRef.current, {
      scale: 0, duration: 0.38,
      ease: 'elastic.out(1.4, 0.5)',
      transformOrigin: 'center center',
    })
  }, { scope: gRef })

  return (
    <g ref={gRef} className="dbm-tick-marker">
      {/* Glow ring */}
      <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.18} />
      {/* Dot */}
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="white" strokeWidth="1.2" />
      <text
        x={cx} y={cy + 1.3}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="4.5" fill="white"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >✕</text>
    </g>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  selected: TickZoneId[]
  onChange?: (zones: TickZoneId[]) => void
  mode?: 'edit' | 'view'
  tickCount?: number  // drives emotional state in view mode
  size?: number       // max-width in px (backwards compat with existing call sites)
}

export default function DogBodyMap({
  selected, onChange, mode = 'edit', tickCount, size,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isView = mode === 'view'
  const ticks = tickCount ?? selected.length
  const mood  = getMood(ticks)
  const color = markerFill(mood)

  function toggle(zoneId: TickZoneId) {
    if (isView || !onChange) return
    onChange(
      selected.includes(zoneId)
        ? selected.filter(z => z !== zoneId)
        : [...selected, zoneId]
    )
  }

  // ── GSAP emotional-state animations ────────────────────────────────────────
  useGSAP(() => {
    if (!isView) return

    if (mood === 'happy') {
      // Gentle happy wiggle
      gsap.fromTo('.dbm-img',
        { rotation: -2.5, transformOrigin: '50% 65%' },
        {
          rotation: 2.5, duration: 0.42, repeat: 3, yoyo: true, ease: 'sine.inOut',
          onComplete: () => gsap.to('.dbm-img', { rotation: 0, duration: 0.35, ease: 'sine.out' }),
        }
      )
      // Sparkles burst in with stagger from random positions
      gsap.from('.dbm-sparkle', {
        scale: 0, opacity: 0, y: 10,
        stagger: { each: 0.07, from: 'random' },
        duration: 0.52, ease: 'back.out(1.7)',
      })
      // "All Clear" badge bounces in
      gsap.from('.dbm-happy-badge', {
        scale: 0, opacity: 0, y: -10,
        duration: 0.68, ease: 'elastic.out(1.1, 0.5)', delay: 0.55,
      })
    } else {
      // Distressed shake
      gsap.from('.dbm-img', {
        x: -5, duration: 0.07, repeat: 5, yoyo: true, ease: 'none',
      })
      // Sad face expression scales in
      gsap.from('.dbm-sad-face', {
        opacity: 0, scale: 0.65, duration: 0.48,
        ease: 'back.out(1.3)', delay: 0.2,
        transformOrigin: '50% 50%',
      })
      // Tick markers pulse — faster and more frantic when distressed
      gsap.to('.dbm-tick-marker', {
        scale: 1.3, opacity: 0.75,
        duration: mood === 'distressed' ? 0.4 : 0.68,
        repeat: -1, yoyo: true,
        stagger: { each: 0.1, from: 'random' },
        ease: 'sine.inOut',
        transformOrigin: 'center center',
      })
    }
  }, { scope: containerRef, dependencies: [mood, isView] })

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={size ? { maxWidth: size, margin: '0 auto' } : undefined}
    >
      {/* ── Dog illustration ──────────────────────────────────────────────── */}
      <img
        src="/images/dog-belly-map.png"
        alt="Dog body diagram"
        draggable={false}
        className="dbm-img w-full h-auto block"
      />

      {/* ── SVG hit areas + tick markers ──────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* Clickable zones */}
        {HIT_AREAS.map((area, i) => {
          const isSel = selected.includes(area.zoneId)
          return (
            <circle
              key={i}
              cx={area.cx} cy={area.cy} r={area.r}
              fill={isSel ? `${color}22` : 'transparent'}
              stroke={
                isSel        ? color
                : mode === 'edit' ? 'rgba(222,184,106,0.32)'
                : 'none'
              }
              strokeWidth={isSel ? 1.5 : 1}
              strokeDasharray={!isSel && mode === 'edit' ? '2 2' : undefined}
              onClick={() => toggle(area.zoneId)}
              style={{ cursor: mode === 'edit' ? 'pointer' : 'default', touchAction: 'manipulation' }}
            />
          )
        })}

        {/* Tick dot markers */}
        {selected.flatMap(zoneId =>
          (MARKER_CENTERS[zoneId] ?? []).map((pt, i) => (
            <TickMarker key={`${zoneId}-${i}`} cx={pt.cx} cy={pt.cy} color={color} />
          ))
        )}
      </svg>

      {/* ── Happy state: sparkles + badge ────────────────────────────────── */}
      {isView && mood === 'happy' && (
        <>
          {SPARKLES.map((s, i) => (
            <div
              key={i}
              className="dbm-sparkle absolute pointer-events-none text-sm leading-none"
              style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {s.c}
            </div>
          ))}
          <div
            className="dbm-happy-badge absolute left-1/2 -translate-x-1/2 whitespace-nowrap
                        px-4 py-1.5 rounded-full text-xs font-bold"
            style={{
              top: '46%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white',
              boxShadow: '0 4px 16px rgba(16,185,129,0.42)',
            }}
          >
            ✓ All Clear!
          </div>
        </>
      )}

      {/* ── Sad expression overlay — positioned over the dog's face ──────── */}
      {/*    left 24% / top 4% / width 52% / height 28% targets the face area */}
      {isView && mood !== 'happy' && (
        <div
          className="dbm-sad-face absolute pointer-events-none"
          style={{ left: '24%', top: '4%', width: '52%', height: '28%', zIndex: 10 }}
        >
          <svg viewBox="0 0 100 58" className="w-full h-full" overflow="visible">
            {/* Cover the dog's original happy eyes with skin colour */}
            <ellipse cx="32" cy="43" rx="9" ry="8" fill="#FAF0DC" />
            <ellipse cx="68" cy="43" rx="9" ry="8" fill="#FAF0DC" />

            {/* Worried / furrowed brows */}
            <path d="M 18 25 Q 32 17, 44 23"
              stroke="#5C3D1E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M 82 25 Q 68 17, 56 23"
              stroke="#5C3D1E" strokeWidth="3.5" fill="none" strokeLinecap="round" />

            {/* Sad open eyes */}
            <ellipse cx="32" cy="43" rx="8" ry="8" fill="#4B3621" />
            <ellipse cx="68" cy="43" rx="8" ry="8" fill="#4B3621" />
            {/* Highlights */}
            <circle cx="35" cy="41" r="2.5" fill="white" />
            <circle cx="71" cy="41" r="2.5" fill="white" />

            {/* Teardrop(s) — one for sad, two for distressed */}
            <path d="M 30 52 Q 28 59, 30 63 Q 32 59, 30 52" fill="#93C5FD" />
            {mood === 'distressed' && (
              <path d="M 70 52 Q 68 59, 70 63 Q 72 59, 70 52" fill="#93C5FD" />
            )}

            {/* Frown */}
            <path d="M 37 56 Q 50 50, 63 56"
              stroke="#4B3621" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* ── Edit mode tap hint ────────────────────────────────────────────── */}
      {mode === 'edit' && selected.length === 0 && (
        <p
          className="absolute bottom-1 inset-x-0 text-center font-medium pointer-events-none"
          style={{ fontSize: '9px', color: 'oklch(0.65 0.12 75)', opacity: 0.7 }}
        >
          tap areas where ticks were found
        </p>
      )}
    </div>
  )
}
