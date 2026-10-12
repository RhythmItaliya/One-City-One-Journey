// Loads the timetables and builds the planner index once. The planner and the About page share it.
import { useMemo } from 'react'
import { useData } from '../../lib/useData.js'
import { buildIndex } from './plan.js'

let built = null // { bp, feeders, lines, ix }

/** const { ix, facts, error } = usePlanner()   ix and facts are null until every file has loaded. */
export function usePlanner() {
  const bp = useData('bus_patterns.json'), feeders = useData('station_access.json'), lines = useData('metro_lines.json'), facts = useData('metro_facts.json')
  const ix = useMemo(() => {
    if (!bp.data || !feeders.data || !lines.data) return null
    if (!built || built.bp !== bp.data || built.feeders !== feeders.data || built.lines !== lines.data) {
      built = { bp: bp.data, feeders: feeders.data, lines: lines.data, ix: buildIndex(bp.data, feeders.data, lines.data) }
    }
    return built.ix
  }, [bp.data, feeders.data, lines.data])
  return { ix, facts: facts.data, error: bp.error || feeders.error || lines.error || facts.error }
}
