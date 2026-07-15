// Shared shimmer block for loading.tsx route skeletons. Tinted to the brand
// cream/teal palette (never gray) so a loading screen still reads as PupStep,
// not a generic placeholder — respects prefers-reduced-motion by falling
// back to a static tint instead of the shimmer sweep.
export function Skeleton({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`pupstep-skeleton rounded-2xl ${className}`}
      style={{ background: 'oklch(0.48 0.17 196 / 0.08)', ...style }}
    />
  )
}
