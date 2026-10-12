// Small geo helpers. Points are { lat, lng, ... } objects. All distances in metres.
const R = 6371008.8 // mean Earth radius (m)
const rad = (d) => (d * Math.PI) / 180

export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Nearest n points to `origin`, each returned with a `distance` (m) field, sorted ascending. */
export function nearest(origin, points, n = 1) {
  return points
    .map((p) => ({ ...p, distance: haversine(origin, p) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n)
}

/** All points within `radiusM` metres of `origin`, sorted by distance. */
export function withinRadius(origin, points, radiusM) {
  return points
    .map((p) => ({ ...p, distance: haversine(origin, p) }))
    .filter((p) => p.distance <= radiusM)
    .sort((a, b) => a.distance - b.distance)
}

/** Bounding box [[minLat, minLng], [maxLat, maxLng]] (Leaflet-ready) or null. */
export function bbox(points) {
  if (!points.length) return null
  let [a, b, c, d] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const p of points) {
    a = Math.min(a, p.lat); b = Math.min(b, p.lng)
    c = Math.max(c, p.lat); d = Math.max(d, p.lng)
  }
  return [[a, b], [c, d]]
}

/** GeoJSON FeatureCollection -> [{ lat, lng, ...properties }] for Point features. */
export function pointsFromGeoJSON(fc) {
  return (fc?.features || [])
    .filter((f) => f.geometry?.type === 'Point')
    .map((f) => ({ ...f.properties, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }))
}

export const fmtDistance = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`)
