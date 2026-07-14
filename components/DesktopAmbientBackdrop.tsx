'use client'

// Desktop-only ambient scene for the signed-in app shell (home, my-account,
// my-reports). These pages are designed mobile-first as a single narrow
// column — correct for a phone, but on a wide desktop browser that column
// just sits alone in a sea of blank cream. This renders behind it: soft
// brand-color blobs + slow-floating paw prints, entirely decorative,
// entirely hidden below the lg breakpoint, so mobile is byte-for-byte
// unaffected (this component simply doesn't render any visible box <1024px).
export default function DesktopAmbientBackdrop() {
  return (
    <div
      className="hidden lg:block fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Soft color blobs, brand hue, heavily blurred — same technique as the
          marketing homepage's hero blobs, kept far lower-opacity here since
          this sits behind a working dashboard, not a hero moment. */}
      <div
        className="ps-desk-blob"
        style={{
          position: 'absolute', top: '-10%', left: '-8%', width: 560, height: 560,
          borderRadius: '50%', background: 'oklch(0.48 0.17 196 / 0.07)', filter: 'blur(90px)',
        }}
      />
      <div
        className="ps-desk-blob"
        style={{
          position: 'absolute', bottom: '-15%', right: '-10%', width: 620, height: 620,
          borderRadius: '50%', background: '#FF8C52', opacity: 0.055, filter: 'blur(100px)',
          animationDelay: '-4s',
        }}
      />

      {/* Scattered outline paw prints — same restrained motif as the
          marketing site, drifting very slowly so it reads as "alive"
          without ever competing with the actual dashboard content. */}
      {PAW_POSITIONS.map((p, i) => (
        <svg
          key={i}
          className="ps-desk-paw"
          viewBox="0 0 24 24"
          width={p.size}
          height={p.size}
          style={{ position: 'absolute', top: p.top, left: p.left, right: p.right, animationDelay: p.delay, opacity: 0.1 }}
        >
          <g fill="none" stroke="oklch(0.48 0.17 196)" strokeWidth="1.4">
            <circle cx="7" cy="13" r="2.1" />
            <circle cx="11.5" cy="9.5" r="1.7" />
            <circle cx="15.5" cy="9.5" r="1.7" />
            <circle cx="19" cy="13" r="1.7" />
            <ellipse cx="12.5" cy="17.5" rx="4.6" ry="3.4" />
          </g>
        </svg>
      ))}

      <style>{`
        @keyframes psDeskFloat {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-22px) translateX(10px); }
        }
        @keyframes psDeskBlobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -18px) scale(1.05); }
        }
        .ps-desk-blob { animation: psDeskBlobFloat 16s ease-in-out infinite; }
        .ps-desk-paw { animation: psDeskFloat 9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ps-desk-blob, .ps-desk-paw { animation: none; }
        }
      `}</style>
    </div>
  )
}

const PAW_POSITIONS: { top?: string; left?: string; right?: string; size: number; delay: string }[] = [
  { top: '8%', left: '6%', size: 26, delay: '0s' },
  { top: '22%', right: '8%', size: 20, delay: '-3s' },
  { top: '52%', left: '4%', size: 22, delay: '-6s' },
  { top: '68%', right: '6%', size: 28, delay: '-2s' },
  { top: '85%', left: '10%', size: 18, delay: '-5s' },
]
