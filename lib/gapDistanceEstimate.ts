// Shared GPS gap-distance estimation, used by every client that tracks a
// live walk via watchPosition (WalkerClient, StartWalkPanel, LiveWalkClient).
// Kept in one place so a future policy change (pace band, gap cap) can't
// drift out of sync between them the way the underlying bug once did.
//
// The problem: when GPS goes quiet for 30s+ (screen lock, backgrounded tab),
// naively adding the straight-line distance between the bracket points
// overstates a wandering dog's path, but adding zero is worse — it's a
// strong, usually false, claim that no movement happened at all. One real
// report showed 260m for a 33-minute walk because 28 of those minutes had
// no GPS signal and were counted as zero distance.
//
// Instead, gap distance is estimated as pace x duration, where pace is
// calibrated from this walk's own confirmed (non-gap) GPS segments — not a
// generic constant — clamped to a plausible dog-walk speed band, and capped
// per gap so a forgotten/unattended walk can't accrue unbounded phantom
// distance.

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const MIN_WALK_PACE_MPS = 0.3   // very slow / lots of sniffing
export const MAX_WALK_PACE_MPS = 2.2   // a light trot
export const DEFAULT_WALK_PACE_MPS = 1.0 // used only before any pace is confirmed this walk
export const MIN_CONFIRMED_SEC_FOR_PACE = 30 // don't trust a pace derived from a few seconds of data
export const MAX_GAP_ESTIMATE_SEC = 600 // cap per-gap extrapolation at 10 minutes

// gapSec: length of the tracking gap, in seconds.
// confirmedDistanceKm / confirmedSec: cumulative distance/time from this
// walk's own clean (non-gap, non-jitter-rejected) GPS segments so far.
export function estimateGapDistanceKm(
  gapSec: number,
  confirmedDistanceKm: number,
  confirmedSec: number,
): number {
  if (gapSec <= 0) return 0
  const pace =
    confirmedSec >= MIN_CONFIRMED_SEC_FOR_PACE
      ? (confirmedDistanceKm * 1000) / confirmedSec
      : DEFAULT_WALK_PACE_MPS
  const clampedPace = Math.min(MAX_WALK_PACE_MPS, Math.max(MIN_WALK_PACE_MPS, pace))
  const effectiveGapSec = Math.min(gapSec, MAX_GAP_ESTIMATE_SEC)
  return (clampedPace * effectiveGapSec) / 1000
}
