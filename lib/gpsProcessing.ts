// GPS route post-processing: outlier rejection, smoothing, road map-matching,
// and moving-vs-stationary segmentation.
//
// This is display-time processing (client-side, in WalkReportCard) rather
// than a write-time transform — it recomputes on each view instead of being
// stored on the walk_reports row. Deliberate for the evaluation phase: zero
// schema changes, fully reversible, nothing to migrate on the live DB while
// we decide whether the output is actually good enough to ship. If we keep
// it, the natural next step is computing this once at report-creation time
// and caching the result, both to avoid re-hitting the map-matching API on
// every view and because a cached "official" distance/route matters once
// parents start comparing reports to each other.
//
// Map-matching uses OSRM's public demo server (router.project-osrm.org).
// That server is for evaluation only — no SLA, rate-limited, not meant for
// production traffic. If this proves worth shipping, the two realistic
// production options are: (a) Google's Roads API (snapToRoads), reusing the
// Maps billing account already set up for the JS map, or (b) a self-hosted
// OSRM instance with an India road extract. Decide once we know the
// map-matching quality is actually worth the dependency.

export interface GpsPoint {
  lat: number
  lng: number
  ts?: string
  accuracy?: number
}

export interface MovementSegment {
  type: 'moving' | 'stationary'
  startTs: string
  endTs: string
  durationSec: number
  distanceMeters: number
}

// True great-circle distance — flat-earth approximation drifts more than it
// should over anything but a very short segment, and this isn't the
// performance-critical hot path client-side cleanRoute() is.
const EARTH_RADIUS_M = 6371000
export function haversineMeters(a: GpsPoint, b: GpsPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

// ── Step 1: outlier rejection + smoothing ──────────────────────────────────
//
// Two passes:
// 1. Reject points that are physically implausible given the time elapsed
//    since the last ACCEPTED point (a dog walk realistically never exceeds
//    ~2.5 m/s sustained; 4 m/s gives headroom for a jog after a squirrel).
//    Falls back to pure accuracy-based rejection when timestamps are
//    missing (older recorded walks, or points with no `ts`).
// 2. A small weighted moving-average pass over the accepted points, weighted
//    by inverse GPS accuracy (a point reported accurate to 5m should pull
//    the smoothed position toward it much harder than one accurate to 40m).
//    Window of 3 deliberately small — a wider window starts eating real
//    corners out of the path, which defeats the point of a walk report.
const MAX_PLAUSIBLE_SPEED_MS = 4
const MAX_ACCURACY_M = 60

export function smoothRoute(raw: GpsPoint[]): GpsPoint[] {
  if (raw.length < 2) return raw

  // Pass 1 — reject accuracy/speed outliers relative to last accepted point
  const accepted: GpsPoint[] = [raw[0]]
  for (let i = 1; i < raw.length; i++) {
    const point = raw[i]
    const prev = accepted[accepted.length - 1]

    if (point.accuracy != null && point.accuracy > MAX_ACCURACY_M) continue

    if (point.ts && prev.ts) {
      const dtSec = (new Date(point.ts).getTime() - new Date(prev.ts).getTime()) / 1000
      if (dtSec > 0) {
        const dist = haversineMeters(prev, point)
        const impliedSpeed = dist / dtSec
        // A large time gap (phone locked/suspended) legitimately allows a
        // big jump — only reject implausible speed over a SHORT interval.
        if (dtSec < 20 && impliedSpeed > MAX_PLAUSIBLE_SPEED_MS) continue
      }
    } else {
      // No timestamps to reason about speed — fall back to the simpler
      // single-jump distance check used elsewhere in this app.
      const dist = haversineMeters(prev, point)
      if (dist > 150 && i < raw.length - 1) continue
    }

    accepted.push(point)
  }
  if (accepted.length < 3) return accepted

  // Pass 2 — accuracy-weighted 3-point moving average
  const weight = (p: GpsPoint) => 1 / Math.max(p.accuracy ?? 15, 5)
  const smoothed: GpsPoint[] = [accepted[0]]
  for (let i = 1; i < accepted.length - 1; i++) {
    const p0 = accepted[i - 1]
    const p1 = accepted[i]
    const p2 = accepted[i + 1]
    const w0 = weight(p0)
    const w1 = weight(p1) * 2 // center point still counts most
    const w2 = weight(p2)
    const total = w0 + w1 + w2
    smoothed.push({
      lat: (p0.lat * w0 + p1.lat * w1 + p2.lat * w2) / total,
      lng: (p0.lng * w0 + p1.lng * w1 + p2.lng * w2) / total,
      ts: p1.ts,
      accuracy: p1.accuracy,
    })
  }
  smoothed.push(accepted[accepted.length - 1])
  return smoothed
}

// ── Step 2: map-matching ────────────────────────────────────────────────────
//
// Snaps the smoothed path onto actual roads/paths via OSRM's match service.
// Returns null on any failure (network, no match found, malformed response)
// so the caller can fall back to the smoothed-but-unmatched path — this must
// never be the thing that breaks a report.
export async function matchToRoads(points: GpsPoint[]): Promise<GpsPoint[] | null> {
  if (points.length < 2) return null
  try {
    // OSRM matching degrades badly above a few hundred points in one request —
    // downsample evenly rather than truncate, so the whole walk is still
    // represented even on a very long/dense route.
    const MAX_POINTS = 100
    const sampled = points.length > MAX_POINTS
      ? points.filter((_, i) => i % Math.ceil(points.length / MAX_POINTS) === 0)
      : points

    const coords = sampled.map((p) => `${p.lng},${p.lat}`).join(';')
    const timestamps = sampled.every((p) => p.ts)
      ? sampled.map((p) => Math.floor(new Date(p.ts!).getTime() / 1000)).join(';')
      : null

    const url = new URL(`https://router.project-osrm.org/match/v1/foot/${coords}`)
    url.searchParams.set('geometries', 'geojson')
    url.searchParams.set('overview', 'full')
    if (timestamps) url.searchParams.set('timestamps', timestamps)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.matchings?.length) return null

    // A matching can span multiple sub-legs if OSRM couldn't confidently
    // match the whole thing as one trace — concatenate them in order.
    const matchedCoords: [number, number][] = data.matchings.flatMap(
      (m: { geometry: { coordinates: [number, number][] } }) => m.geometry.coordinates
    )
    if (matchedCoords.length < 2) return null

    return matchedCoords.map(([lng, lat]) => ({ lat, lng }))
  } catch {
    return null
  }
}

// ── Step 3: moving vs stationary segmentation ───────────────────────────────
//
// Classifies consecutive point-pairs as "moving" or "stationary" by implied
// speed, then merges adjacent same-type segments. Requires timestamps —
// returns null when the route has none (older recorded walks).
const STATIONARY_SPEED_MS = 0.3 // ~1 km/h — dog sniffing/pausing, not walking

export function segmentMovement(points: GpsPoint[]): MovementSegment[] | null {
  const withTs = points.filter((p) => p.ts)
  if (withTs.length < 2) return null

  const raw: { type: 'moving' | 'stationary'; ts: string; distanceMeters: number }[] = []
  for (let i = 1; i < withTs.length; i++) {
    const a = withTs[i - 1]
    const b = withTs[i]
    const dtSec = (new Date(b.ts!).getTime() - new Date(a.ts!).getTime()) / 1000
    if (dtSec <= 0) continue
    const dist = haversineMeters(a, b)
    const speed = dist / dtSec
    raw.push({ type: speed >= STATIONARY_SPEED_MS ? 'moving' : 'stationary', ts: b.ts!, distanceMeters: dist })
  }
  if (!raw.length) return null

  const segments: MovementSegment[] = []
  let current: MovementSegment = {
    type: raw[0].type,
    startTs: withTs[0].ts!,
    endTs: raw[0].ts,
    durationSec: (new Date(raw[0].ts).getTime() - new Date(withTs[0].ts!).getTime()) / 1000,
    distanceMeters: raw[0].distanceMeters,
  }
  for (let i = 1; i < raw.length; i++) {
    const step = raw[i]
    if (step.type === current.type) {
      current.endTs = step.ts
      current.durationSec = (new Date(step.ts).getTime() - new Date(current.startTs).getTime()) / 1000
      current.distanceMeters += step.distanceMeters
    } else {
      segments.push(current)
      current = { type: step.type, startTs: current.endTs, endTs: step.ts, durationSec: 0, distanceMeters: step.distanceMeters }
      current.durationSec = (new Date(step.ts).getTime() - new Date(current.startTs).getTime()) / 1000
    }
  }
  segments.push(current)
  return segments
}

export function summarizeMovement(segments: MovementSegment[]): { movingSec: number; stationarySec: number; movingDistanceMeters: number } {
  let movingSec = 0
  let stationarySec = 0
  let movingDistanceMeters = 0
  for (const seg of segments) {
    if (seg.type === 'moving') {
      movingSec += seg.durationSec
      movingDistanceMeters += seg.distanceMeters
    } else {
      stationarySec += seg.durationSec
    }
  }
  return { movingSec, stationarySec, movingDistanceMeters }
}

// Total path distance via haversine — more accurate than a flat-earth chord
// sum, meaningfully so once the path is map-matched onto actual road curves.
export function routeDistanceMeters(points: GpsPoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += haversineMeters(points[i - 1], points[i])
  return total
}
