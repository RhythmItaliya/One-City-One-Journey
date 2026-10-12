// Display parts shared by the planner and the About page: place tags, option chips, the step list and the fare split.
import { Fragment } from 'react'
import { Bus, TrainFront } from 'lucide-react'
import { cn } from '../../components/ui'
import { lineHex } from '../../components/blocks/lineColors.js'
import { lineName, toHHMM } from './metro.js'
import { OPERATORS, TRANSFER_DISCOUNT, CLEARING_FEE } from './plan.js'

export const rs = (n) => `₹${Math.round(n)}`
export const rs2 = (n) => `₹${n.toFixed(2)}`
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export const PlaceIcon = ({ p }) => (p.kind === 'station' ? <TrainFront className="size-4 shrink-0 text-slate-700" /> : <Bus className="size-4 shrink-0 text-slate-500" />)
export const PlaceTags = ({ p }) => (
  <span className="flex shrink-0 gap-1">
    {p.kind === 'station' ? p.lines.map((c) => <span key={c} title={`Metro ${lineName(c)}`} className="size-2.5 rounded-full" style={{ background: lineHex(c) }} />)
      : p.agencies.map((a) => <span key={a} className="rounded px-1 text-[10px] font-bold text-white" style={{ background: OPERATORS[a].hex }}>{a}</span>)}
  </span>
)

const Pill = ({ bg, children }) => <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: bg }}>{children}</span>

/** One pill per ride and per walk: [AMTS 66/3] → (walk 8 min) → [Metro Blue] → … */
export function Chips({ legs }) {
  const out = []
  legs.forEach((l, i) => {
    if (l.mode === 'bus') out.push(<Pill key={i} bg={OPERATORS[l.agency].hex}>{l.agency} {l.route}</Pill>)
    else if (l.mode === 'metro') l.route.legs.forEach((m, k) => out.push(<Pill key={`${i}-${k}`} bg={lineHex(m.colour)}>Metro {lineName(m.colour)}</Pill>))
    else out.push(<span key={i} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">walk {l.min} min</span>)
  })
  return (
    <div className="flex flex-wrap items-center gap-1">
      {out.map((c, i) => <Fragment key={i}>{i > 0 && <span className="text-xs text-slate-400">→</span>}{c}</Fragment>)}
    </div>
  )
}

/** Rides with a coloured bar, walks as amber boxes. Bus waits come from the timetable: the time you reach the stop to the bus time. */
export function Steps({ o, from, to }) {
  const rows = []
  let t = o.depart
  for (const l of o.legs) {
    if (l.mode === 'walk' || l.mode === 'transfer') {
      rows.push({ kind: 'walk', label: l.mode === 'transfer' ? 'Transfer walk' : 'Walk', title: `${l.min} min (${l.m} m)`, sub: `${l.from} → ${l.to}` })
      t += l.min
    } else if (l.mode === 'bus') {
      const wait = Math.round(l.board - t)
      rows.push({ kind: 'ride', bg: OPERATORS[l.agency].hex, badge: `${l.agency} ${l.route}`, head: `${toHHMM(l.board)} · towards ${l.headsign}`,
        board: `Board at ${l.from}${wait > 0 ? ` · wait ${wait} min` : ''}`, off: `Get off at ${l.to} (${toHHMM(l.alight)})`,
        sub: `${plural(l.stops, 'stop')} · ${l.km.toFixed(1)} km · ${rs(l.fare)} alone` })
      t = l.alight
    } else {
      const n = l.tl.legs.length
      l.tl.legs.forEach((m, k) => rows.push({ kind: 'ride', bg: lineHex(m.colour), badge: `Metro ${lineName(m.colour)}`, head: `${toHHMM(m.boardAt)} · towards ${m.towards}`,
        board: k ? `Change at ${m.board}` : `Board at ${m.board}`, off: `Get off at ${m.alight} (${toHHMM(m.alightAt)})`,
        sub: [plural(m.stops, 'stop'), k === n - 1 && `${l.km.toFixed(1)} km · ${rs(l.fare)} alone`, k === 0 && `incl. ~${Math.round(l.wait)} min average wait`].filter(Boolean).join(' · ') }))
      for (const w of l.tl.warnings) rows.push({ kind: 'warn', title: w.text })
      t = l.alight
    }
  }
  return (
    <ol className="space-y-2">
      <li className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="size-2.5 rounded-full bg-slate-900" />{toHHMM(o.depart)} · Start: {from.name}</li>
      {rows.map((r, i) => (
        <li key={i}>
          {r.kind === 'walk' && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-900"><span className="mr-2 text-xs font-bold uppercase tracking-wide text-amber-700">{r.label}</span>{r.title}</p>
              <p className="text-sm text-slate-600">{r.sub}</p>
            </div>
          )}
          {r.kind === 'ride' && (
            <div className="flex gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <span className="w-1 shrink-0 rounded-full" style={{ background: r.bg }} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold" style={{ color: r.bg }}><Pill bg={r.bg}>{r.badge}</Pill>{r.head}</p>
                <p className="mt-1 text-sm text-slate-600">{r.board}</p>
                <p className="font-semibold text-slate-900">{r.off}</p>
                <p className="text-sm text-slate-500">{r.sub}</p>
              </div>
            </div>
          )}
          {r.kind === 'warn' && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{r.title}</p>}
        </li>
      ))}
      <li className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="size-2.5 rounded-full border-2 border-slate-900" />{toHHMM(o.arrive)} · Arrive: {to.name}</li>
    </ol>
  )
}

/** Short name for the coloured bar. */
const BAR_NAME = { GMRC: 'Metro', BRTS: 'BRTS', AMTS: 'AMTS' }

/** The one fare and what each operator gets. Rows are shown in the order you ride them. showRule=false hides the rule box. */
export function FareSplit({ split, legs, showRule = true }) {
  const order = [...new Set(legs.filter((l) => l.mode === 'bus' || l.mode === 'metro').map((l) => (l.mode === 'metro' ? 'GMRC' : l.agency)))]
  const rows = [...split.rows].sort((a, b) => order.indexOf(a.op) - order.indexOf(b.op))
  const total = split.oneFare || 1
  const km = rows.reduce((s, r) => s + r.km, 0)
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        {rows.length > 1
          ? `${rs(split.standalone)} if bought separately, ${rs(split.oneFare)} with one ticket. Each operator is paid for its own part of the trip.`
          : `Only ${OPERATORS[rows[0].op].name} runs this trip, so it keeps the whole ${rs(split.oneFare)}, minus the ${CLEARING_FEE * 100}% fee.`}
      </p>
      <div className="flex h-7 overflow-hidden rounded-lg text-[11px] font-semibold text-white">
        {rows.map((r) => (
          <div key={r.op} className="flex min-w-0 items-center justify-center truncate px-1" style={{ width: `${(r.share / total) * 100}%`, background: OPERATORS[r.op].hex }}>
            {r.share / total > 0.2 && `${BAR_NAME[r.op]} ${rs2(r.share)}`}
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500"><th className="py-1 font-medium">Operator</th><th className="pl-3 text-right font-medium">km</th><th className="pl-3 text-right font-medium">Alone</th><th className="pl-3 text-right font-medium">Share</th><th className="pl-3 text-right font-medium">Net</th></tr></thead>
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr key={r.op} className="border-t border-slate-100">
                <td className="py-1.5 pr-2"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: OPERATORS[r.op].hex }} />{OPERATORS[r.op].name}</td>
                <td className="pl-3 text-right">{r.km.toFixed(1)}</td><td className="pl-3 text-right">{rs(r.fare)}</td><td className="pl-3 text-right font-semibold">{rs2(r.share)}</td><td className="pl-3 text-right font-semibold">{rs2(r.net)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-100 text-slate-600"><td className="py-1.5">Integrator fee {CLEARING_FEE * 100}%</td><td /><td /><td /><td className="pl-3 text-right">{rs2(split.fee)}</td></tr>
            <tr className="border-t border-slate-200 font-semibold"><td className="py-1.5">Total</td><td className="pl-3 text-right">{km.toFixed(1)}</td><td className="pl-3 text-right">{rs(split.standalone)}</td><td className="pl-3 text-right">{rs(split.oneFare)}</td><td className="pl-3 text-right">{rs(split.oneFare)}</td></tr>
          </tbody>
        </table>
      </div>
      {showRule && (
        <p className={cn('rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600')}>
          <b className="text-slate-900">Split rule (our proposal):</b> each operator keeps its standalone fare, minus its km-share of a ₹{TRANSFER_DISCOUNT} discount
          per change between operators ({split.opChanges === 1 ? '1 change' : `${split.opChanges} changes`} = {rs(split.discount)} off), minus a {CLEARING_FEE * 100}% clearing fee that pays the private integrator.
          Bus fare slabs are our assumption and the metro fare is an estimate.
        </p>
      )}
    </div>
  )
}
