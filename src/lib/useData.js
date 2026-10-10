import { useEffect, useState } from 'react'
import { loadData } from './data.js'

/** const { data, loading, error } = useData('stations.geojson') */
export function useData(name) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  useEffect(() => {
    let alive = true
    setState({ data: null, loading: true, error: null })
    loadData(name).then((data) => alive && setState({ data, loading: false, error: data == null ? `Missing /data/${name}` : null }))
    return () => { alive = false }
  }, [name])
  return state
}
