'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'

/**
 * PupStep's shared "tap-safe" async button.
 *
 * Solves the double-tap problem: users (parents + walkers, often low tech
 * literacy) tap a button, see nothing happen instantly, and tap again 2-3
 * more times — risking duplicate API calls (e.g. Start Walk / End Walk).
 *
 * This component:
 * 1. Disables itself the instant it's tapped (before the async work even starts).
 * 2. Shows an obvious, branded loading state (pulsing paw + label swap) instead
 *    of a generic spinner — respects prefers-reduced-motion.
 * 3. Re-enables itself automatically once the promise settles, and surfaces
 *    a brief inline error shake + message if the action throws/rejects, so
 *    the user is never stuck staring at a dead button.
 *
 * Works for both:
 *  - fully self-managed actions: pass `onClick` returning a Promise, the
 *    button manages its own pending state.
 *  - externally-managed state (e.g. an existing `submitting` flag from a
 *    form): pass `loading` + `onClick`, the button just renders the state.
 */

type ConflictingHandlers =
  | 'onClick'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'

export interface LoadingButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, ConflictingHandlers> {
  /** Click handler. May be async — the button auto-disables until it resolves/rejects. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
  /** Label shown while idle/enabled. */
  children: React.ReactNode
  /** Label shown while the async action is in flight. Defaults to children. */
  loadingText?: React.ReactNode
  /** Optional externally-controlled loading state (overrides internal pending state when provided). */
  loading?: boolean
  /** Visual style. Matches PupStep brand colors. */
  variant?: 'primary' | 'danger' | 'outline' | 'whatsapp'
  /** Show a transient error message under the button if onClick throws/rejects. */
  showInlineError?: boolean
  className?: string
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  primary: { background: 'oklch(0.48 0.17 196)', color: '#fff' },
  danger: { background: '#DC2626', color: '#fff' },
  whatsapp: { background: '#25D366', color: '#fff' },
  outline: {
    background: '#fff',
    color: 'oklch(0.48 0.17 196)',
    border: '2px solid oklch(0.48 0.17 196)',
  },
}

/** Small pulsing paw-print — PupStep's branded loading indicator. */
function PawPulse({ reduceMotion }: { reduceMotion: boolean }) {
  if (reduceMotion) {
    return <span style={{ fontSize: 16, lineHeight: 1 }}>🐾</span>
  }
  return (
    <motion.span
      style={{ fontSize: 16, lineHeight: 1, display: 'inline-block' }}
      animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
    >
      🐾
    </motion.span>
  )
}

export function LoadingButton({
  onClick,
  children,
  loadingText,
  loading: loadingProp,
  variant = 'primary',
  showInlineError = false,
  className = '',
  style,
  disabled,
  type = 'button',
  ...rest
}: LoadingButtonProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reduceMotion = !!useReducedMotion()
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  const isControlled = loadingProp !== undefined
  const isLoading = isControlled ? loadingProp : pending
  const isDisabled = !!disabled || isLoading

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick || isDisabled) return
      setError(null)
      if (!isControlled) setPending(true)
      try {
        await onClick(e)
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        }
      } finally {
        if (!isControlled && mountedRef.current) setPending(false)
      }
    },
    [onClick, isDisabled, isControlled]
  )

  const variantStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary

  return (
    <div style={{ width: style?.width ?? '100%' }}>
      <motion.button
        type={type}
        disabled={isDisabled}
        onClick={handleClick}
        whileTap={reduceMotion || isDisabled ? undefined : { scale: 0.97 }}
        className={className}
        style={{
          width: '100%',
          fontFamily: 'var(--font-fredoka)',
          fontWeight: 700,
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled && !isLoading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          ...variantStyle,
          ...style,
        }}
        {...rest}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.span
              key="loading"
              initial={reduceMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <PawPulse reduceMotion={reduceMotion} />
              {loadingText ?? children}
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={reduceMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {children}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      {showInlineError && error && (
        <motion.p
          initial={reduceMotion ? undefined : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: 'var(--font-nunito)',
            fontSize: 12,
            color: '#DC2626',
            margin: '6px 2px 0',
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </motion.p>
      )}
    </div>
  )
}

export default LoadingButton
