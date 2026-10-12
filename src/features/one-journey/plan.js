// PS-08 planner: AMTS + BRTS (real GTFS timetable, bus_patterns.json) + metro (metro.js) in ONE journey.
// Pure logic, no React, no network. Times are minutes since midnight.
import { haversine } from '../../lib/geo.js'
import { findRoute, estimateFare, timeline, toHHMM } from './metro.js'

export const WALK_M_PER_MIN = 75 // metro_facts (ASSUMED 4.5 km/h)
const DETOUR = 1.3 // straight line -> street walk (ASSUMED)
const WALK_MAX_M = 1000 // walk to/from a station if it is this close (straight line)
export const METRO_HEADWAY = { blue: 10, red: 12, yellow: 20, violet: 53 } // average headways (metro_facts); expected wait = half
// Bus fare slabs by km (ASSUMED; BRTS publishes a ₹5–₹50 range, AMTS slabs not in our data).
const SLABS = {
  AMTS: [[3, 5], [5, 10], [8, 15], [14, 20], [20, 25], [Infinity, 30]],
  BRTS: [[2, 5], [5, 10], [8, 15], [12, 20], [16, 25], [20, 30], [25, 35], [Infinity, 40]],
}
export const busFare = (agency, km) => SLABS[agency].find(([k]) => km <= k)[1]
export const TRANSFER_DISCOUNT = 5 // ₹ off per change between operators (our proposal)
export const CLEARING_FEE = 0.02 // integrator fee per integrated ticket (our PPP proposal)

/** Earliest departure of pattern p from stop index i at or after time t (real timetable). */
function nextDep(p, i, t) {
  const target = t - p.c[i]
  let lo = 0, hi = p.d.length
  while (lo < hi) { const m = (lo + hi) >> 1; if (p.d[m] < target) lo = m + 1; else hi = m }
  return lo < p.d.length ? p.d[lo] + p.c[i] : null
}

export function buildIndex(bp, feeders, lines) {
  const byStop = new Map()
  bp.patterns.forEach((p, pi) => p.s.forEach((sid, i) => { if (!byStop.has(sid)) byStop.set(sid, []); byStop.get(sid).push([pi, i]) }))
  const feederOf = new Map(), stationFeeders = new Map()
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v) }
  for (const f of feeders) for (const b of f.bus_stops) {
    push(feederOf, b.stop_id, { station: f.station, walk: b.walk_min, m: b.dist_m })
    push(stationFeeders, f.station, { stopId: b.stop_id, walk: b.walk_min, m: b.dist_m })
  }
  const stations = new Map()
  for (const l of lines) for (const s of l.stations) {
    const prev = stations.get(s.name)
    stations.set(s.name, { kind: 'station', key: 'M:' + s.name, name: s.name, lat: s.lat, lng: s.lon, lines: [...new Set([...(prev?.lines || []), l.colour])] })
  }
  const groups = new Map()
  for (const [sid, [name, lat, lng]] of Object.entries(bp.stops)) {
    const g = groups.get(name) || { kind: 'stop', key: 'B:' + name, name, stopIds: [], lat: 0, lng: 0, agencies: new Set() }
    g.stopIds.push(sid); g.lat += lat; g.lng += lng
    for (const [pi] of byStop.get(sid) || []) g.agencies.add(bp.patterns[pi].a)
    groups.set(name, g)
  }
  const stops = [...groups.values()].map((g) => ({ ...g, lat: g.lat / g.stopIds.length, lng: g.lng / g.stopIds.length, agencies: [...g.agencies].sort() }))
  return { bp, byStop, feederOf, stationFeeders, stations, lines, places: [...stations.values(), ...stops] }
}

const stopName = (ix, sid) => ix.bp.stops[sid]?.[0] || sid
const stopPt = (ix, sid) => ({ lat: ix.bp.stops[sid][1], lng: ix.bp.stops[sid][2] })

function busLeg(ix, pi, i, j, dep) {
  const p = ix.bp.patterns[pi]
  let km = 0
  for (let k = i + 1; k <= j; k++) km += haversine(stopPt(ix, p.s[k - 1]), stopPt(ix, p.s[k])) / 1000
  return { mode: 'bus', agency: p.a, route: p.r, headsign: p.h, from: stopName(ix, p.s[i]), to: stopName(ix, p.s[j]),
    board: dep, alight: dep + p.c[j] - p.c[i], stops: j - i, km, fare: busFare(p.a, km) }
}

/** Every station we can reach from the origin, with the earliest time we stand at its gate. */
function toStations(ix, place, t0) {
  const best = new Map()
  const offer = (st, ready, legs) => { if (!best.has(st) || best.get(st).ready > ready) best.set(st, { ready, legs }) }
  if (place.kind === 'station') return offer(place.name, t0, []), best
  for (const s of ix.stations.values()) {
    const m = haversine(place, s)
    if (s.name !== place.name && m <= WALK_MAX_M) {
      const w = Math.round((m * DETOUR) / WALK_M_PER_MIN)
      offer(s.name, t0 + w, [{ mode: 'walk', min: w, m: Math.round(m * DETOUR), from: place.name, to: `${s.name} metro` }])
    }
  }
  if (place.kind !== 'stop') return best
  for (const sid of place.stopIds) for (const [pi, i] of ix.byStop.get(sid) || []) {
    const p = ix.bp.patterns[pi]
    const dep = nextDep(p, i, t0)
    if (dep == null) continue
    for (let k = i + 1; k < p.s.length; k++) for (const f of ix.feederOf.get(p.s[k]) || []) {
      const ready = dep + p.c[k] - p.c[i] + f.walk
      if (best.has(f.station) && best.get(f.station).ready <= ready) continue
      offer(f.station, ready, [busLeg(ix, pi, i, k, dep), { mode: 'transfer', min: f.walk, m: f.m, from: stopName(ix, p.s[k]), to: `${f.station} metro` }])
    }
  }
  return best
}

/** Ways to finish from each station to the destination (timed later, once we know when we reach the station). */
function fromStations(ix, place) {
  const c = new Map()
  const add = (st, o) => { if (!c.has(st)) c.set(st, []); c.get(st).push(o) }
  if (place.kind === 'station') return add(place.name, { kind: 'none', est: 0 }), c
  for (const s of ix.stations.values()) {
    const m = haversine(place, s)
    if (s.name !== place.name && m <= WALK_MAX_M) { const w = Math.round((m * DETOUR) / WALK_M_PER_MIN); add(s.name, { kind: 'walk', min: w, m: Math.round(m * DETOUR), est: w }) }
  }
  if (place.kind !== 'stop') return c
  for (const sid of place.stopIds) for (const [pi, j] of ix.byStop.get(sid) || []) {
    const p = ix.bp.patterns[pi]
    for (let k = 0; k < j; k++) for (const f of ix.feederOf.get(p.s[k]) || []) add(f.station, { kind: 'bus', pi, k, j, walk: f.walk, m: f.m, est: f.walk + p.c[j] - p.c[k] + 8 })
  }
  return c
}

function finish(ix, o, station, t, destName) {
  if (o.kind === 'none') return { arrive: t, legs: [] }
  if (o.kind === 'walk') return { arrive: t + o.min, legs: [{ mode: 'walk', min: o.min, m: o.m, from: `${station} metro`, to: destName }] }
  const p = ix.bp.patterns[o.pi]
  const dep = nextDep(p, o.k, t + o.walk)
  if (dep == null) return null
  const leg = busLeg(ix, o.pi, o.k, o.j, dep)
  return { arrive: leg.alight, legs: [{ mode: 'transfer', min: o.walk, m: o.m, from: `${station} metro`, to: leg.from }, leg] }
}

const vehicleLegs = (legs) => legs.filter((l) => l.mode === 'bus' || l.mode === 'metro')
const rides = (o) => vehicleLegs(o.legs).map((l) => (l.mode === 'bus' ? `${l.agency}${l.route}` : l.route.legs.map((m) => m.colour).join('+'))).join('>')
const sig = (legs) => vehicleLegs(legs).map((l) => (l.mode === 'bus' ? `${l.agency}${l.route}` : l.route.legs.map((m) => m.colour + m.board).join('+'))).join('>')

/** plan(ix, facts, fromPlace, toPlace, minutes) -> up to 4 options, fastest first, each tagged. */
export function plan(ix, facts, from, to, t0) {
  if (!ix || !from || !to || from.key === to.key) return []
  const found = []
  // 1. One-seat bus.
  if (from.kind === 'stop' && to.kind === 'stop') {
    const dest = new Set(to.stopIds)
    for (const sid of from.stopIds) for (const [pi, i] of ix.byStop.get(sid) || []) {
      const p = ix.bp.patterns[pi]
      const j = p.s.findIndex((s, k) => k > i && dest.has(s))
      const dep = j > 0 ? nextDep(p, i, t0) : null
      if (dep != null) found.push({ legs: [busLeg(ix, pi, i, j, dep)] })
    }
  }
  // 2. (walk | bus) -> metro -> (walk | bus).
  const A = [...toStations(ix, from, t0)].sort((a, b) => a[1].ready - b[1].ready).slice(0, 10)
  const E = [...fromStations(ix, to)].map(([st, os]) => [st, os, Math.min(...os.map((o) => o.est))]).sort((a, b) => a[2] - b[2]).slice(0, 10)
  for (const [s1, a] of A) for (const [s2, os] of E) {
    if (s1 === s2) continue
    const r = findRoute(ix.lines, facts, s1, s2)
    if (!r) continue
    const wait = (METRO_HEADWAY[r.legs[0].colour] || 10) / 2
    const board = a.ready + wait
    const tl = timeline(r, toHHMM(board), facts)
    if (tl.status === 'no') continue
    const atS2 = board + r.totalMin
    let e = null
    for (const o of os) { const x = finish(ix, o, s2, atS2, to.name); if (x && (!e || x.arrive < e.arrive)) e = x }
    if (!e) continue
    const metro = { mode: 'metro', route: r, tl, wait, board, alight: atS2, from: s1, to: s2, km: r.km, fare: estimateFare(r.km, facts) }
    found.push({ legs: [...a.legs, metro, ...e.legs] })
  }
  // Totals, de-duplicate, rank.
  const seen = new Set()
  const opts = found.map((o) => {
    const last = o.legs[o.legs.length - 1]
    const arrive = last.alight ?? (o.legs.length ? (o.legs.at(-2)?.alight ?? t0) + (last.min || 0) : t0)
    const v = vehicleLegs(o.legs)
    return { ...o, depart: t0, arrive, minutes: Math.round(arrive - t0), transfers: Math.max(0, v.length - 1),
      walkMin: o.legs.reduce((s, l) => s + (l.mode === 'walk' || l.mode === 'transfer' ? l.min : 0), 0), split: fareSplit(o.legs) }
  }).sort((a, b) => a.minutes - b.minutes || a.split.oneFare - b.split.oneFare || a.walkMin - b.walkMin)
    .filter((o) => { const k = sig(o.legs); if (seen.has(k)) return false; seen.add(k); return true })
    // Same buses and metro lines via other stations: keep it only if it is faster or cheaper.
    .filter((o, i, all) => !all.some((p, j) => j < i && rides(p) === rides(o) && p.minutes <= o.minutes && p.split.oneFare <= o.split.oneFare))
  const top = opts.slice(0, 3)
  const cheapest = [...opts].sort((a, b) => a.split.oneFare - b.split.oneFare || a.arrive - b.arrive)[0]
  if (cheapest && !top.includes(cheapest)) top.push(cheapest)
  const minTr = Math.min(...top.map((x) => x.transfers)), sameTr = top.every((x) => x.transfers === minTr)
  return top.map((o, i) => ({ ...o, tags: [i === 0 && 'Fastest', o === cheapest && top.length > 1 && 'Cheapest', !sameTr && o.transfers === minTr && 'Fewest changes'].filter(Boolean) }))
}

export const OPERATORS = {
  GMRC: { name: 'GMRC Metro', hex: '#1e293b' },
  BRTS: { name: 'AJL BRTS Janmarg', hex: '#ea580c' },
  AMTS: { name: 'AMTS City Bus', hex: '#16a34a' },
}
const opOf = (l) => (l.mode === 'metro' ? 'GMRC' : l.agency)

/** One ticket for the whole trip, split fairly: each operator gets its standalone fare minus its km-share of the
 *  transfer discount, minus a 2% clearing fee for the integrator (our proposal, numbers ASSUMED). */
export function fareSplit(legs) {
  const v = vehicleLegs(legs)
  const rows = Object.keys(OPERATORS).map((op) => {
    const ls = v.filter((l) => opOf(l) === op)
    return { op, km: ls.reduce((s, l) => s + l.km, 0), fare: ls.reduce((s, l) => s + l.fare, 0) }
  }).filter((r) => r.km > 0)
  const standalone = rows.reduce((s, r) => s + r.fare, 0)
  const opChanges = v.slice(1).filter((l, i) => opOf(l) !== opOf(v[i])).length
  const discount = Math.min(TRANSFER_DISCOUNT * opChanges, standalone - Math.max(0, ...rows.map((r) => r.fare)))
  const oneFare = standalone - discount
  const totalKm = rows.reduce((s, r) => s + r.km, 0) || 1
  for (const r of rows) {
    r.share = r.fare - (discount * r.km) / totalKm
    r.fee = r.share * CLEARING_FEE
    r.net = r.share - r.fee
  }
  return { rows, standalone, discount, oneFare, fee: rows.reduce((s, r) => s + r.fee, 0), opChanges }
}
