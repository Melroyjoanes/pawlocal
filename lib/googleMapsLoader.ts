/**
 * Shared Google Maps JS API loader.
 *
 * Previously every map component injected its own `<script src="https://maps.googleapis.com/maps/api/js?key=...">`
 * tag directly, without `loading=async`. That triggers this console warning (and a real perf
 * cost — it blocks on a synchronous fetch/parse instead of the lazy dynamic-library-import path):
 *
 *   "Google Maps JavaScript API has been loaded directly without loading=async.
 *    This can result in suboptimal performance."
 *
 * This module implements Google's official recommended bootstrap loader snippet, which loads the
 * base script asynchronously and defers fetching any given library (maps, marker, etc.) until
 * `google.maps.importLibrary(...)` is actually called. It's also a singleton — calling
 * `loadGoogleMaps()` from multiple components at once (this app renders map widgets on several
 * pages) reuses the same in-flight/resolved promise instead of racing to inject duplicate
 * <script> tags, which is what the old per-component `document.getElementById('gmaps-script')`
 * checks were trying (imperfectly) to do.
 *
 * `importLibrary` also populates the global `google.maps` namespace as a side effect, so existing
 * call sites that do `new google.maps.Marker(...)`, `google.maps.Polyline`, etc. keep working
 * unchanged after awaiting `loadGoogleMaps()`.
 */

let mapsPromise: Promise<typeof google.maps> | null = null

export function loadGoogleMaps(apiKey: string | undefined): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadGoogleMaps can only be called in the browser'))
  }

  if (mapsPromise) return mapsPromise

  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is not set'))
  }

  // Already loaded (e.g. by a previous page navigation in the same SPA session).
  // Cast through a shape where every level is explicitly optional — the ambient
  // @types/google.maps declarations mark `window.google` etc. as always-present,
  // which isn't true before the script has actually loaded, and makes TS treat this
  // presence check as a tautology (TS2774) if we don't route around it.
  const existing = window as unknown as {
    google?: { maps?: { importLibrary?: (name: string) => Promise<unknown> } }
  }
  if (existing.google?.maps?.importLibrary) {
    mapsPromise = Promise.resolve(window.google.maps)
    return mapsPromise
  }

  mapsPromise = new Promise((resolve, reject) => {
    // Google's official async bootstrap loader (adapted to TS) — see
    // https://developers.google.com/maps/documentation/javascript/load-maps-js-api
    ;(g => {
      let h: Promise<void> | undefined
      let a: HTMLScriptElement
      let k: string
      const p = 'The Google Maps JavaScript API'
      const c = 'google'
      const l = 'importLibrary'
      const q = '__ib__'
      const m = document
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let b = window as unknown as Record<string, any>
      b = b[c] || (b[c] = {})
      const d = b.maps || (b.maps = {})
      const r = new Set<string>()
      const e = new URLSearchParams()
      const u = () =>
        h ||
        (h = new Promise<void>((resolveInner, rejectInner) => {
          a = m.createElement('script')
          e.set('libraries', [...r].join(','))
          for (k in g) {
            e.set(k.replace(/[A-Z]/g, t => '_' + t[0].toLowerCase()), (g as Record<string, string>)[k])
          }
          e.set('callback', c + '.maps.' + q)
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e.toString()
          d[q] = resolveInner
          a.onerror = () => {
            h = undefined
            rejectInner(new Error(p + ' could not load.'))
          }
          a.nonce = (m.querySelector('script[nonce]') as HTMLScriptElement | null)?.nonce || ''
          m.head.append(a)
        }))
      if (d[l]) {
        console.warn(p + ' only loads once. Ignoring:', g)
      } else {
        d[l] = (f: string, ...n: unknown[]) => r.add(f) && u().then(() => d[l](f, ...n))
      }
    })({ key: apiKey, v: 'weekly' })

    // Kick off the libraries this app actually uses (core map objects + legacy Marker),
    // then resolve once both are ready.
    Promise.all([
      window.google.maps.importLibrary('maps'),
      window.google.maps.importLibrary('marker'),
    ])
      .then(() => resolve(window.google.maps))
      .catch(err => {
        mapsPromise = null
        reject(err)
      })
  })

  return mapsPromise
}
