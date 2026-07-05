// Server-side heuristic to flag (never block) walk reports whose GPS data
// doesn't plausibly show a real walk happened. Thresholds are named consts
// so they're easy to tune once we have real fraud data to calibrate against.

const MIN_DURATION_FOR_GPS_CHECK = 5 // minutes — below this, missing GPS isn't suspicious
const MIN_DURATION_FOR_MOVEMENT_CHECK = 10 // minutes — below this, low movement isn't suspicious
const MIN_DISPLACEMENT_METERS = 50 // total GPS displacement below this, for a 10+ min walk, looks faked

export type WalkPlausibility = {
  suspicious: boolean
  reason: string | null
}

/**
 * Haversine distance between two lat/lng points, in meters.
 */
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Assess whether a submitted walk's GPS route plausibly matches a real walk
 * of the claimed duration. This is a flag-only heuristic — false positives
 * are worse than missed fraud at this stage, so it should never block a
 * report from being saved or delivered.
 */
export function assessWalkPlausibility(
  routePoints: { lat: number; lng: number }[] | null,
  durationMins: number
): WalkPlausibility {
  const points = routePoints ?? []

  // A walk of meaningful length with zero GPS points is the easiest fake to catch.
  if (points.length === 0 && durationMins > MIN_DURATION_FOR_GPS_CHECK) {
    return { suspicious: true, reason: 'no_gps_data' }
  }

  // A walk claimed to be 10+ minutes with almost no GPS movement is suspicious.
  if (points.length >= 2 && durationMins >= MIN_DURATION_FOR_MOVEMENT_CHECK) {
    let totalDisplacement = 0
    for (let i = 1; i < points.length; i++) {
      totalDisplacement += haversineMeters(points[i - 1], points[i])
    }

    if (totalDisplacement < MIN_DISPLACEMENT_METERS) {
      return { suspicious: true, reason: 'no_movement' }
    }
  }

  return { suspicious: false, reason: null }
}
