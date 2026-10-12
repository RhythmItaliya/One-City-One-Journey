// Pure routing over metro_lines.json + metro_facts.json. No React, no network.
import { haversine } from '../../lib/geo.js'

export const CHANGE_MIN = 5
const LINE_NAME = { blue: 'Blue', red: 'Red', yellow: 'Yellow', violet: 'Violet' }
export const lineName = (c) => LINE_NAME[c] || c

export const toMin = (hhmm) => { const [h, m] = String(hhmm || '00:00').split(':').map(Number); return h * 60 + m }
export const toHHMM = (min) => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }

/** Minutes per stop for a line colour = end_to_end_min / (stations - 1). */
function perStopMin(lines, facts, colour) {
  const entry = lines.find((l) => l.colour === colour)
  const e2e = facts?.lines?.[colour]?.end_to_end_min
  if (!entry || !e2e) return 2.5 // assumption if data missing
  return e2e / (entry.stations.length - 1)
}

/** Dijkstra over (station, colour) states. Riding one stop costs perStop; changing line costs CHANGE_MIN. */
export function findRoute(lines, facts, from, to) {
  if (!lines || !from || !to || from === to) return null
  const per = {}
  const adj = new Map() // key "station|colour" -> [{to, w, kind}]
  const add = (a, b, w, kind) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push({ to: b, w, kind }) }
  const coloursAt = new Map()
  for (const l of lines) {
    per[l.colour] ??= perStopMin(lines, facts, l.colour)
    l.stations.forEach((s, i) => {
      if (!coloursAt.has(s.name)) coloursAt.set(s.name, new Set())
      coloursAt.get(s.name).add(l.colour)
      if (i > 0) add(`${l.stations[i - 1].name}|${l.colour}`, `${s.name}|${l.colour}`, per[l.colour], 'ride')
    })
  }
  for (const [st, cs] of coloursAt) for (const a of cs) for (const b of cs) if (a !== b) add(`${st}|${a}`, `${st}|${b}`, CHANGE_MIN, 'change')
  if (!coloursAt.has(from) || !coloursAt.has(to)) return null

  // Small graph (~120 nodes): simple O(n^2) Dijkstra is plenty.
  const dist = new Map(), prev = new Map(), done = new Set()
  for (const c of coloursAt.get(from)) dist.set(`${from}|${c}`, 0)
  for (;;) {
    let u = null, best = Infinity
    for (const [k, d] of dist) if (!done.has(k) && d < best) { best = d; u = k }
    if (u == null) break
    done.add(u)
    if (u.startsWith(to + '|')) break
    for (const e of adj.get(u) || []) {
      const nd = best + e.w
      if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, u) }
    }
  }
  const end = [...coloursAt.get(to)].map((c) => `${to}|${c}`).filter((k) => dist.has(k)).sort((a, b) => dist.get(a) - dist.get(b))[0]
  if (!end) return null
  const path = []
  for (let k = end; k; k = prev.get(k)) path.unshift(k)
  const nodes = path.map((k) => { const [station, colour] = k.split('|'); return { station, colour } })

  // Group consecutive same-colour nodes into legs (drop zero-length legs created by change edges).
  const legs = []
  for (const n of nodes) {
    const last = legs[legs.length - 1]
    if (last && last.colour === n.colour) last.stations.push(n.station)
    else legs.push({ colour: n.colour, stations: [n.station] })
  }
  const realLegs = legs.filter((l) => l.stations.length > 1)

  const coordOf = new Map()
  lines.forEach((l) => l.stations.forEach((s) => coordOf.set(s.name, { lat: s.lat, lng: s.lon })))

  let km = 0
  const out = realLegs.map((leg) => {
    const board = leg.stations[0], alight = leg.stations[leg.stations.length - 1]
    const sameColour = lines.filter((l) => l.colour === leg.colour)
    const dirIndex = sameColour.findIndex((l) => {
      const n = l.stations.map((s) => s.name)
      return n.indexOf(board) >= 0 && n.indexOf(board) < n.indexOf(alight)
    })
    const entry = sameColour[dirIndex]
    const towards = entry.stations[entry.stations.length - 1].name
    const stops = leg.stations.length - 1
    for (let i = 1; i < leg.stations.length; i++) km += haversine(coordOf.get(leg.stations[i - 1]), coordOf.get(leg.stations[i])) / 1000
    return { colour: leg.colour, dirIndex, towards, board, alight, stops, stations: leg.stations, minutes: stops * per[leg.colour], boardIndex: entry.stations.findIndex((s) => s.name === board) }
  })

  const rideMin = out.reduce((a, l) => a + l.minutes, 0)
  const changes = Math.max(0, out.length - 1)
  return { from, to, legs: out, changes, stops: out.reduce((a, l) => a + l.stops, 0), km, rideMin, totalMin: rideMin + changes * CHANGE_MIN, perStop: per }
}

/** Rough fare slabs by straight-line km along the route (ASSUMED slabs, anchored to metro_facts min 5 / phase-1 max 25 / APMC-GIFT 35). */
export function estimateFare(km, facts) {
  const f = facts?.fares_inr || { min: 5, phase1_max: 25, apmc_to_gift_city: 35 }
  const slabs = [[2, f.min], [5, 10], [10, 15], [15, 20], [22, f.phase1_max], [26, 30]]
  for (const [upTo, fare] of slabs) if (km <= upTo) return fare
  return f.apmc_to_gift_city
}

/** Adds clock times to each leg + warnings (last train, violet windows). */
export function timeline(route, depart, facts) {
  if (!route) return null
  let t = toMin(depart)
  const legs = route.legs.map((l, i) => {
    if (i > 0) t += CHANGE_MIN
    const boardAt = t
    t += l.minutes
    return { ...l, boardAt, alightAt: t }
  })
  const warnings = []
  let status = 'yes'
  const y = facts?.lines?.yellow || {}
  for (const l of legs) {
    if (l.colour === 'yellow') {
      // Estimated last yellow departure from the boarding station (ESTIMATE from the 21:00 / 21:20 last departures).
      const towardsMM = l.towards === 'Mahatma Mandir'
      const base = towardsMM ? toMin(y.last_from_koteshwar_to_mahatma_mandir || '21:20') : toMin(y.last_from_mahatma_mandir || '21:00')
      const offset = towardsMM ? (l.boardIndex - 1) * l.minutes / l.stops : l.boardIndex * l.minutes / l.stops
      const lastAt = base + offset
      if (l.boardAt > lastAt) {
        status = 'no'
        warnings.push({ level: 'no', text: `LAST TRAIN GONE: the last Yellow train towards ${l.towards} leaves ${l.board} at about ${toHHMM(lastAt)} (estimate). You reach it at ${toHHMM(l.boardAt)}.` })
      } else if (l.boardAt >= toMin('20:30')) {
        if (status === 'yes') status = 'warn'
        warnings.push({ level: 'warn', text: `Last-train warning: the Yellow (Gandhinagar) line stops early. Last train towards ${l.towards} leaves ${l.board} at about ${toHHMM(lastAt)} (estimate); you board at ${toHHMM(l.boardAt)}, ${Math.round(lastAt - l.boardAt)} min to spare.` })
      }
    }
    if (l.colour === 'violet') {
      const wins = (facts?.lines?.violet?.service_windows || ['07:36-10:18', '16:06-19:13']).map((w) => w.split('-').map(toMin))
      if (!wins.some(([a, b]) => l.boardAt >= a && l.boardAt <= b)) {
        status = 'no'
        warnings.push({ level: 'no', text: `Violet line (GNLU–GIFT City) only runs ${facts?.lines?.violet?.service_windows?.join(' and ') || '07:36–10:18 and 16:06–19:13'}. You reach ${l.board} at ${toHHMM(l.boardAt)}: no train.` })
      }
    }
    if (l.colour === 'blue' || l.colour === 'red') {
      // First/last train from the terminus + running time to the boarding station (ESTIMATE; red uses the APMC time both ways).
      const f = facts?.lines?.[l.colour] || {}
      const offset = l.boardIndex * l.minutes / l.stops
      const firstAt = toMin(f.first || '06:20') + offset
      const lastAt = toMin(f.last || f.last_from_apmc || '23:00') + offset
      if (l.boardAt < firstAt || l.boardAt > lastAt) {
        status = 'no'
        warnings.push({ level: 'no', text: `No ${lineName(l.colour)} line train: trains leave ${l.board} about ${toHHMM(firstAt)}–${toHHMM(lastAt)} (estimate). You reach it at ${toHHMM(l.boardAt)}.` })
      } else if (l.boardAt > lastAt - 30) {
        if (status === 'yes') status = 'warn'
        warnings.push({ level: 'warn', text: `Last-train warning: the last ${lineName(l.colour)} line train leaves ${l.board} at about ${toHHMM(lastAt)} (estimate); ${Math.round(lastAt - l.boardAt)} min to spare.` })
      }
    }
  }
  return { legs, depart: toHHMM(toMin(depart)), arrive: toHHMM(t), status, warnings }
}
