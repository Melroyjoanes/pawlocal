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

// Smaller hit areas — precise, non-overlapping
const HIT_AREAS: { zoneId: TickZoneId; cx: number; cy: number; r: number }[] = [
  { zoneId: 'left_ear',     cx: 20,  cy: 13,  r: 7  },
  { zoneId: 'right_ear',    cx: 80,  cy: 13,  r: 7  },
  { zoneId: 'neck',         cx: 50,  cy: 29,  r: 5  },
  { zoneId: 'back',         cx: 50,  cy: 47,  r: 8  },
  { zoneId: 'belly',        cx: 50,  cy: 64,  r: 9  },
  { zoneId: 'armpits',      cx: 16,  cy: 46,  r: 6  },
  { zoneId: 'armpits',      cx: 84,  cy: 46,  r: 6  },
  { zoneId: 'groin',        cx: 50,  cy: 82,  r: 7  },
  { zoneId: 'base_of_tail', cx: 50,  cy: 120, r: 5  },
  { zoneId: 'between_toes', cx: 20,  cy: 104, r: 6  },
  { zoneId: 'between_toes', cx: 80,  cy: 104, r: 6  },
]

const MARKER_CENTERS: Record<TickZoneId, { cx: number; cy: number }[]> = {
  left_ear:     [{ cx: 20, cy: 13 }],
  right_ear:    [{ cx: 80, cy: 13 }],
  neck:         [{ cx: 50, cy: 29 }],
  back:         [{ cx: 50, cy: 47 }],
  belly:        [{ cx: 50, cy: 64 }],
  armpits:      [{ cx: 16, cy: 46 }, { cx: 84, cy: 46 }],
  groin:        [{ cx: 50, cy: 82 }],
  base_of_tail: [{ cx: 50, cy: 120 }],
  between_toes: [{ cx: 20, cy: 104 }, { cx: 80, cy: 104 }],
}

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
  return mood === 'happy'  ? '#10B981'
    : mood === 'mild'      ? '#F59E0B'
    : mood === 'sad'       ? '#EF4444'
    : /* distressed */       '#DC2626'
}

// CSS filter per mood — desaturates the illustration subtly
function imgFilter(mood: Mood) {
  if (mood === 'happy') return 'none'
  if (mood === 'mild')  return 'saturate(0.82) brightness(0.97)'
  if (mood === 'sad')   return 'saturate(0.60) brightness(0.92)'
  return                       'saturate(0.40) brightness(0.87)'
}

// Clean minimal tick marker — just a glowing dot, no crude × symbol
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
      {/* Soft glow */}
      <circle cx={cx} cy={cy} r={4.5} fill={color} opacity={0.20} />
      {/* Clean dot */}
      <circle cx={cx} cy={cy} r={2.5} fill={color} stroke="white" strokeWidth="1.2" />
    </g>
  )
}

type Props = {
  selected: TickZoneId[]
  onChange?: (zones: TickZoneId[]) => void
  mode?: 'edit' | 'view'
  tickCount?: number
  size?: number
}

export default function DogBodyMap({
  selected, onChange, mode = 'edit', tickCount, size,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isView = mode === 'view'
  const ticks  = tickCount ?? selected.length
  const mood   = getMood(ticks)
  const color  = markerFill(mood)

  function toggle(zoneId: TickZoneId) {
    if (isView || !onChange) return
    onChange(
      selected.includes(zoneId)
        ? selected.filter(z => z !== zoneId)
        : [...selected, zoneId]
    )
  }

  useGSAP(() => {
    if (!isView) return

    if (mood === 'happy') {
      gsap.fromTo('.dbm-img',
        { rotation: -2.5, transformOrigin: '50% 65%' },
        {
          rotation: 2.5, duration: 0.42, repeat: 3, yoyo: true, ease: 'sine.inOut',
          onComplete: () => gsap.to('.dbm-img', { rotation: 0, duration: 0.35, ease: 'sine.out' }),
        }
      )
      gsap.from('.dbm-sparkle', {
        scale: 0, opacity: 0, y: 10,
        stagger: { each: 0.07, from: 'random' },
        duration: 0.52, ease: 'back.out(1.7)',
      })
      gsap.from('.dbm-happy-badge', {
        scale: 0, opacity: 0, y: -10,
        duration: 0.68, ease: 'elastic.out(1.1, 0.5)', delay: 0.55,
      })
    } else {
      // Shake the dog
      gsap.from('.dbm-img', {
        x: -5, duration: 0.07, repeat: 5, yoyo: true, ease: 'none',
      })

      // Teardrops fall and fade, looping
      if (mood !== 'mild') {
        gsap.fromTo('.dbm-tear',
          { y: 0, opacity: 0.95 },
          {
            y: 20, opacity: 0,
            duration: mood === 'distressed' ? 0.9 : 1.3,
            ease: 'power2.in',
            repeat: -1,
            repeatDelay: 0.8,
            stagger: { each: 0.45 },
            delay: 0.35,
          }
        )
      }

      // Tick markers pulse
      gsap.to('.dbm-tick-marker', {
        scale: 1.35, opacity: 0.7,
        duration: mood === 'distressed' ? 0.38 : 0.65,
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
      {/* Dog illustration — CSS filter conveys emotional state without crude overlays */}
      <img
        src="/images/dog-belly-map.png"
        alt="Dog body diagram"
        draggable={false}
        className="dbm-img w-full h-auto block"
        style={{
          filter: isView ? imgFilter(mood) : 'none',
          transition: 'filter 0.5s ease',
        }}
      />

      {/* SVG hit areas + tick markers */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {HIT_AREAS.map((area, i) => {
          const isSel = selected.includes(area.zoneId)
          return (
            <circle
              key={i}
              cx={area.cx} cy={area.cy} r={area.r}
              fill={isSel ? `${color}1A` : 'transparent'}
              stroke={
                isSel         ? color
                : mode === 'edit' ? 'rgba(222,184,106,0.28)'
                : 'none'
              }
              strokeWidth={isSel ? 1.2 : 0.8}
              strokeDasharray={!isSel && mode === 'edit' ? '1.5 1.5' : undefined}
              onClick={() => toggle(area.zoneId)}
              style={{ cursor: mode === 'edit' ? 'pointer' : 'default', touchAction: 'manipulation' }}
            />
          )
        })}

        {selected.flatMap(zoneId =>
          (MARKER_CENTERS[zoneId] ?? []).map((pt, i) => (
            <TickMarker key={`${zoneId}-${i}`} cx={pt.cx} cy={pt.cy} color={color} />
          ))
        )}
      </svg>

      {/* Happy state: sparkles + badge */}
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
            className="dbm-happy-badge absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold"
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

      {/* Sad/distressed: animated teardrops near the dog's eyes — no crude face overlay */}
      {isView && (mood === 'sad' || mood === 'distressed') && (
        <>
          {/* Left teardrop — positioned near left eye */}
          <div
            className="dbm-tear absolute pointer-events-none"
            style={{ left: '35%', top: '20%', transform: 'translateX(-50%)' }}
          >
            <svg width="9" height="13" viewBox="0 0 9 13" fill="none">
              <path d="M4.5 0 C4.5 0 0 5.5 0 8.5 C0 11 2 13 4.5 13 C7 13 9 11 9 8.5 C9 5.5 4.5 0 4.5 0Z"
                fill="rgba(96,165,250,0.80)" />
              <ellipse cx="3" cy="9" rx="1" ry="1.6" fill="rgba(255,255,255,0.35)" />
            </svg>
          </div>
          {/* Right teardrop */}
          <div
            className="dbm-tear absolute pointer-events-none"
            style={{ left: '65%', top: '20%', transform: 'translateX(-50%)' }}
          >
            <svg width="9" height="13" viewBox="0 0 9 13" fill="none">
              <path d="M4.5 0 C4.5 0 0 5.5 0 8.5 C0 11 2 13 4.5 13 C7 13 9 11 9 8.5 C9 5.5 4.5 0 4.5 0Z"
                fill="rgba(96,165,250,0.80)" />
              <ellipse cx="3" cy="9" rx="1" ry="1.6" fill="rgba(255,255,255,0.35)" />
            </svg>
          </div>
        </>
      )}

      {/* Mild — just a small warm-red dot near the face as a subtle alert */}
      {isView && mood === 'mild' && (
        <div
          className="absolute pointer-events-none left-1/2 -translate-x-1/2"
          style={{ top: '26%' }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#F59E0B', boxShadow: '0 0 6px 2px rgba(245,158,11,0.5)' }}
          />
        </div>
      )}

      {/* Edit mode tap hint */}
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
