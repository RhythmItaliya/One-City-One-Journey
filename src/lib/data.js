// Load static files from public/data/** (precached by the service worker => works offline).
const cache = new Map()

/**
 * loadData('stations.geojson') -> parsed JSON (or text for non-JSON files).
 * Returns null if the file does not exist. Results are cached in memory.
 */
export function loadData(name) {
  if (!cache.has(name)) {
    const p = fetch(`/data/${name}`)
      .then(async (r) => {
        if (!r.ok) return null
        const type = r.headers.get('content-type') || ''
        // Vite dev server can return index.html for missing files: treat as missing.
        if (type.includes('text/html')) return null
        if (/\.(geo)?json$/i.test(name) || type.includes('json')) return r.json()
        return r.text()
      })
      .catch(() => null)
    cache.set(name, p)
    // Do not cache failures forever.
    p.then((v) => v === null && cache.delete(name))
  }
  return cache.get(name)
}

/** Reads /data/manifest.json if present: { files: [{ name, description }] } or null. */
export function loadManifest() {
  return loadData('manifest.json')
}

export function clearDataCache() {
  cache.clear()
}
