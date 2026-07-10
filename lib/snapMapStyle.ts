/**
 * Custom Google Maps JSON style — "Snap Map"-inspired: greenery reads as
 * green, water reads as blue, everything else (roads, buildings, land)
 * recedes into muted warm greys so the route line and walker marker are
 * the only things that actually pop. All labels/POI icons are stripped —
 * a live walk-tracking map doesn't need shop names and transit icons
 * competing with the route.
 *
 * This is a plain Google Maps JS "Styled Map" JSON array (no Cloud Console
 * Map ID / cloud-based styling setup required) — works with the existing
 * `new google.maps.Map(el, { styles: SNAP_MAP_STYLE })` pattern already
 * used everywhere in this codebase, zero new dependencies.
 */
export const SNAP_MAP_STYLE: google.maps.MapTypeStyle[] = [
  // Base land — warm off-white, not the default Google grey/tan
  { elementType: 'geometry', stylers: [{ color: '#f3f1ea' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9c9890' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f3f1ea' }] },

  // Administrative boundaries — present but quiet
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#ddd8cb' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },

  // Greenery — parks, gardens, natural land all read as green
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#b9ddb2' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#c6e2bd' }] },
  { featureType: 'landscape.natural.terrain', elementType: 'geometry', stylers: [{ color: '#c6e2bd' }] },

  // Everything else non-natural (buildings, general land-use) — muted grey
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#e7e3d8' }] },

  // POI — strip business icons/labels entirely, keep the map clean
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', elementType: 'geometry', stylers: [{ color: '#f4d9d9' }] },

  // Roads — grey, simplified, minimal labels
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e4e0d3' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f8f6ef' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f1ede1' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e4e0d3' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },

  // Water — blue, no labels
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#a4cede' }] },
  { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },

  // Transit — off, matches the existing behavior
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]
