'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, Play, Pause } from 'lucide-react'

const C = {
  dark:   '#0A2F35',
  orange: '#FF8C52',
  teal:   'oklch(0.48 0.17 196)',
}

// Full-bleed out of the page container so the dark band spans the viewport.
const BLEED: React.CSSProperties = {
  marginLeft:   'calc(50% - 50vw)',
  marginRight:  'calc(50% - 50vw)',
  paddingLeft:  'calc(50vw - 50%)',
  paddingRight: 'calc(50vw - 50%)',
}

type Cut = 'mobile' | 'desktop'

/**
 * Hero demo video.
 *
 * Only ONE <video> is ever mounted. The cut is chosen from matchMedia rather
 * than rendering both and hiding one with CSS, because a hidden <video> still
 * downloads and still plays: with two mounted, unmuting would play both tracks
 * slightly out of phase, and every visitor would pay for the cut they can't see.
 */
export default function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cut, setCut] = useState<Cut | null>(null)   // null until mounted (SSR safe)
  const [muted, setMuted] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)

  // pick the cut, and keep it correct if the window is resized or rotated
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncCut = () => setCut(mq.matches ? 'desktop' : 'mobile')
    const syncRm = () => setReduced(rm.matches)
    syncCut(); syncRm()
    mq.addEventListener('change', syncCut)
    rm.addEventListener('change', syncRm)
    return () => {
      mq.removeEventListener('change', syncCut)
      rm.removeEventListener('change', syncRm)
    }
  }, [])

  // React does not emit the `muted` attribute during SSR, and some browsers
  // refuse to autoplay without it. Set the property directly once mounted.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = muted
    if (!reduced && !started) v.play().then(() => setStarted(true)).catch(() => {})
  }, [cut, muted, reduced, started])

  // Mirror the element's real state instead of assuming it. The browser pauses
  // playback on its own (backgrounded tab, data saver), and the icon must not lie.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    setPlaying(!v.paused)
    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [cut])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().then(() => setStarted(true)).catch(() => {})
    else v.pause()
  }

  const isMobile = cut === 'mobile'
  const poster = isMobile
    ? '/pupstep-demo-mobile-poster.jpg'
    : '/pupstep-demo-desktop-poster.jpg'

  function playNow() {
    const v = videoRef.current
    if (!v) return
    v.play().then(() => setStarted(true)).catch(() => {})
  }

  return (
    <section
      className="px-5 sm:px-8 py-16 sm:py-24"
      style={{
        ...BLEED,
        // Theater treatment. The video's own interior is warm cream, so on the
        // page's #FFFBEB it measured 1.29:1 and had no edge at all. Against the
        // brand dark it is ~12:1 and the media finally reads as an object.
        background: 'linear-gradient(168deg,#0C363D 0%,#0A2F35 52%,#092A30 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto">

        {/* heading, left aligned from md up */}
        <div className="text-center md:text-left mb-8 sm:mb-11 max-w-2xl">
          <span
            className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase mb-4 px-3.5 py-1.5 rounded-full"
            style={{
              background: 'rgba(255,140,82,0.16)',
              color: '#FFB98A',
              border: '1px solid rgba(255,140,82,0.34)',
              fontFamily: 'var(--font-nunito)',
            }}
          >
            20 seconds
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-fredoka)',
              fontSize: 'clamp(1.9rem,4.4vw,3rem)',
              lineHeight: 1.12,
              letterSpacing: '-0.02em',
              color: '#FFFBEB',
            }}
          >
            See a real walk, start to finish.
          </h2>
          <p
            className="mt-4"
            style={{
              fontFamily: 'var(--font-nunito)',
              fontSize: 'clamp(0.98rem,1.8vw,1.1rem)',
              lineHeight: 1.65,
              color: 'rgba(255,251,235,0.72)',
              maxWidth: 540,
            }}
          >
            This is Baxter&apos;s actual walk. Real GPS route, real pee and poop pins,
            real report on WhatsApp.
          </p>
        </div>

        {/* video */}
        <div
          className={
            'relative overflow-hidden mx-auto ' +
            (isMobile
              ? 'w-full max-w-[380px] aspect-[9/16] rounded-[2rem]'
              : 'w-full aspect-video rounded-[2.25rem]')
          }
          style={{
            background: '#FDF5E6',
            // lifted off the dark ground, with a warm rim so the cream edge
            // separates cleanly rather than smearing into the teal
            boxShadow:
              '0 0 0 1px rgba(255,251,235,0.10), 0 30px 70px -20px rgba(0,0,0,0.55)',
          }}
        >
          {/* poster placeholder holds the box before the cut is known, so the
              page never shifts under the reader */}
          {cut === null ? (
            <img
              src="/pupstep-demo-desktop-poster.jpg"
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-0"
            />
          ) : (
            <video
              key={cut}
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              poster={poster}
              loop
              muted
              playsInline
              autoPlay={!reduced}
              preload="metadata"
              aria-label="PupStep demo: a dog walk logged and delivered as a report"
            >
              {cut === 'desktop' && (
                <source src="/pupstep-demo-desktop.webm" type="video/webm" />
              )}
              <source
                src={isMobile ? '/pupstep-demo-mobile.mp4' : '/pupstep-demo-desktop.mp4'}
                type="video/mp4"
              />
            </video>
          )}

          {/* reduced-motion: never autoplay, offer an explicit play */}
          {reduced && !started && cut !== null && (
            <button
              type="button"
              onClick={playNow}
              className="absolute inset-0 grid place-items-center transition-transform active:scale-[0.99]"
              style={{ background: 'rgba(10,47,53,0.28)' }}
              aria-label="Play the PupStep demo video"
            >
              <span
                className="grid place-items-center rounded-full"
                style={{
                  width: 66, height: 66,
                  background: C.orange,
                  boxShadow: '0 8px 22px rgba(245,107,34,0.42)',
                  color: '#fff',
                }}
              >
                <Play size={26} strokeWidth={2.5} style={{ marginLeft: 3 }} fill="currentColor" />
              </span>
            </button>
          )}

          {/* Playback controls. Top-right on mobile: the site has a sticky bottom
              CTA bar that would sit over a bottom-anchored control. Bottom-right
              from sm up. One pill, so it reads as a single control, not two. */}
          {cut !== null && (
            <div
              className="absolute top-3.5 right-3.5 sm:top-auto sm:bottom-5 sm:right-5
                         inline-flex items-stretch rounded-full overflow-hidden"
              style={{
                background: 'rgba(10,47,53,0.62)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.16)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 18px rgba(10,47,53,0.24)',
                color: '#fff',
              }}
            >
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? 'Pause demo video' : 'Play demo video'}
                className="inline-flex items-center px-3 py-2 transition-transform active:scale-[0.94]
                           hover:bg-white/10 focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-[-2px]"
                style={{ outlineColor: C.teal }}
              >
                {playing
                  ? <Pause size={15} strokeWidth={2.2} fill="currentColor" />
                  : <Play size={15} strokeWidth={2.2} fill="currentColor" />}
              </button>

              <span aria-hidden style={{ width: 1, background: 'rgba(255,255,255,0.18)' }} />

              <button
                type="button"
                onClick={() => setMuted(m => !m)}
                aria-label={muted ? 'Unmute demo video' : 'Mute demo video'}
                aria-pressed={!muted}
                className="inline-flex items-center gap-2 pl-3 pr-3.5 py-2 transition-transform
                           active:scale-[0.94] hover:bg-white/10 focus-visible:outline
                           focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                style={{ outlineColor: C.teal }}
              >
                {muted ? <VolumeX size={15} strokeWidth={2.2} /> : <Volume2 size={15} strokeWidth={2.2} />}
                <span
                  className="hidden sm:inline"
                  style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, letterSpacing: '0.01em' }}
                >
                  {muted ? 'Sound on' : 'Sound off'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
