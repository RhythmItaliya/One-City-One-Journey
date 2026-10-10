// One City, One Journey (PS-08): From + To + time -> AMTS/BRTS (real GTFS timetable) + Metro options with
// transfer walks, ONE fare and a fair split between operators. Everything runs on the phone (works offline).
// Prefill: /?from=Naroda Gam&to=Shivranjani&time=18:30
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, Footprints, ArrowRightLeft, Bus, TrainFront, Flag, WifiOff, ArrowUpDown } from 'lucide-react'
import { Card, Badge, Button } from '../../components/ui'
import { TimeInput } from '../../components/blocks/Time.jsx'
import { lineHex } from '../../components/blocks/lineColors.js'
import { useData } from '../../lib/useData.js'
import { lineName, toHHMM, toMin } from './metro.js'
import { buildIndex, plan, OPERATORS, TRANSFER_DISCOUNT, CLEARING_FEE } from './plan.js'

const rs = (n) => `₹${Math.round(n)}`
const rs2 = (n) => `₹${n.toFixed(2)}`

function PlacePicker({ label, places, value, onChange }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return places.filter((p) => p.kind === 'station').slice(0, 30)
    return places.filter((p) => p.name.toLowerCase().includes(s))
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'station' ? -1 : 1) || a.name.toLowerCase().indexOf(s) - b.name.toLowerCase().indexOf(s) || a.name.length - b.name.length)
      .slice(0, 30)
  }, [places, q])
  return (
    <div className="relative">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {value && !open ? (
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm">
          <PlaceIcon p={value} /><span className="flex-1 font-medium">{value.name}</span><PlaceTags p={value} />
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm">
          <Search className="size-4 text-slate-400" />
          <input autoFocus={open} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
            placeholder="Bus stop or metro station…" className="w-full text-sm outline-none" />
          {open && <button type="button" onClick={() => { setOpen(false); setQ('') }}><X className="size-4 text-slate-400" /></button>}
        </div>
      )}
      {open && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {list.map((p) => (
            <li key={p.key}>
              <button type="button" onClick={() => { onChange(p); setOpen(false); setQ('') }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50">
                <PlaceIcon p={p} /><span className="flex-1">{p.name}</span><PlaceTags p={p} />
              </button>
            </li>
          ))}
          {!list.length && <li className="px-3 py-2 text-sm text-slate-500">No match</li>}
        </ul>
      )}
    </div>
  )
}
const PlaceIcon = ({ p }) => (p.kind === 'station' ? <TrainFront className="size-4 text-slate-700" /> : <Bus className="size-4 text-slate-500" />)
const PlaceTags = ({ p }) => (
  <span className="flex gap-1">
    {p.kind === 'station' ? p.lines.map((c) => <span key={c} className="size-2.5 rounded-full" style={{ background: lineHex(c) }} />)
      : p.agencies.map((a) => <span key={a} className="rounded px-1 text-[10px] font-bold text-white" style={{ background: OPERATORS[a].hex }}>{a}</span>)}
  </span>
)

/** Small chip per vehicle leg: [AMTS 66/3] [Blue] [BRTS 9U]. */
function Chips({ legs }) {
  const out = []
  legs.forEach((l, i) => {
    if (l.mode === 'bus') out.push(<span key={i} className="rounded-md px-1.5 py-0.5 text-xs font-bold text-white" style={{ background: OPERATORS[l.agency].hex }}>{l.agency} {l.route}</span>)
    else if (l.mode === 'metro') l.route.legs.forEach((m, k) => out.push(<span key={`${i}-${k}`} className="rounded-md px-1.5 py-0.5 text-xs font-bold text-white" style={{ background: lineHex(m.colour) }}>Metro {lineName(m.colour)}</span>))
    else out.push(<span key={i} className="flex items-center text-xs text-slate-500"><Footprints className="size-3.5" />{l.min}</span>)
  })
  return <div className="flex flex-wrap items-center gap-1">{out.flatMap((c, i) => (i ? [<span key={`a${i}`} className="text-slate-300">›</span>, c] : [c]))}</div>
}

function Steps({ o, from, to }) {
  const rows = []
  let t = o.depart
  rows.push({ icon: Flag, colour: '#0f172a', at: t, title: `Start: ${from.name}` })
  for (const l of o.legs) {
    if (l.mode === 'walk' || l.mode === 'transfer') {
      rows.push({ icon: l.mode === 'transfer' ? ArrowRightLeft : Footprints, colour: '#d97706', walk: true, at: null,
        title: `${l.mode === 'transfer' ? 'Transfer walk' : 'Walk'} ${l.min} min (${l.m} m)`, sub: `${l.from} → ${l.to}` })
    } else if (l.mode === 'bus') {
      rows.push({ icon: Bus, colour: OPERATORS[l.agency].hex, at: l.board, title: `${l.agency} ${l.route} towards ${l.headsign}`,
        sub: `Board at ${l.from}, get off at ${l.to} (${toHHMM(l.alight)}) · ${l.stops} stops · ${l.km.toFixed(1)} km · ${rs(l.fare)} alone` })
    } else {
      l.tl.legs.forEach((m, k) => rows.push({ icon: TrainFront, colour: lineHex(m.colour), at: m.boardAt, title: `${k ? 'Change to ' : ''}Metro ${lineName(m.colour)} line towards ${m.towards}`,
        sub: `${m.board} → ${m.alight} (${toHHMM(m.alightAt)}) · ${m.stops} stops${k === 0 ? ` · includes ~${Math.round(l.wait)} min average wait` : ''}${k === l.tl.legs.length - 1 ? ` · ${l.km.toFixed(1)} km · ${rs(l.fare)} alone` : ''}` }))
      for (const w of l.tl.warnings) rows.push({ icon: Flag, colour: '#dc2626', title: w.text, warn: true })
    }
  }
  rows.push({ icon: Flag, colour: '#0f172a', at: o.arrive, title: `Arrive: ${to.name}` })
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={i} className={`flex gap-3 rounded-xl p-2.5 ${r.walk ? 'border border-dashed border-amber-400 bg-amber-50' : r.warn ? 'bg-rose-50' : ''}`}>
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-white" style={{ background: r.colour }}><r.icon className="size-4" /></span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{r.at != null && <span className="mr-2 font-mono tabular-nums text-slate-500">{toHHMM(r.at)}</span>}{r.title}</p>
            {r.sub && <p className="text-sm text-slate-600">{r.sub}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function FareSplit({ split }) {
  const total = split.oneFare || 1
  return (
    <div className="space-y-3">
      <div className="flex h-5 overflow-hidden rounded-full">
        {split.rows.map((r) => <div key={r.op} style={{ width: `${(r.share / total) * 100}%`, background: OPERATORS[r.op].hex }} title={r.op} />)}
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-1">Operator</th><th>km</th><th>Alone</th><th>Share</th><th>Net</th></tr></thead>
        <tbody>
          {split.rows.map((r) => (
            <tr key={r.op} className="border-t border-slate-100">
              <td className="py-1.5"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: OPERATORS[r.op].hex }} />{OPERATORS[r.op].name}</td>
              <td className="tabular-nums">{r.km.toFixed(1)}</td><td className="tabular-nums">{rs(r.fare)}</td><td className="tabular-nums">{rs2(r.share)}</td><td className="tabular-nums font-semibold">{rs2(r.net)}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-200 font-semibold"><td className="py-1.5">Rider pays (one ticket)</td><td /><td className="tabular-nums">{rs(split.standalone)}</td><td className="tabular-nums">{rs(split.oneFare)}</td><td className="tabular-nums text-slate-500">fee {rs2(split.fee)}</td></tr>
        </tbody>
      </table>
      <p className="text-xs text-slate-500">
        Split rule (our proposal): each operator keeps its own standalone fare, minus its km-share of the ₹{TRANSFER_DISCOUNT} discount
        per change between operators ({split.opChanges} here, so {rs(split.discount)} off), minus a {CLEARING_FEE * 100}% clearing fee that pays
        the private integrator who runs the one ticket. Bus fare slabs are assumptions; the metro fare is an estimate.
      </p>
    </div>
  )
}

export default function OneJourney() {
  const [sp] = useSearchParams()
  const bp = useData('bus_patterns.json'), feeders = useData('station_access.json'), lines = useData('metro_lines.json'), facts = useData('metro_facts.json')
  const ix = useMemo(() => (bp.data && feeders.data && lines.data ? buildIndex(bp.data, feeders.data, lines.data) : null), [bp.data, feeders.data, lines.data])
  const byName = (n) => (n && ix ? ix.places.find((p) => p.name.toLowerCase() === n.toLowerCase()) : null)
  const [fromSel, setFrom] = useState(null)
  const [toSel, setTo] = useState(null)
  const [time, setTime] = useState(sp.get('time') || '')
  const [pick, setPick] = useState(0)
  const from = fromSel || byName(sp.get('from'))
  const to = toSel || byName(sp.get('to'))
  const opts = useMemo(() => (ix && facts.data && from && to && time ? plan(ix, facts.data, from, to, toMin(time)) : []), [ix, facts.data, from, to, time])
  const o = opts[Math.min(pick, opts.length - 1)]

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">PS-08 · City Public Transport</p>
          <h1 className="text-2xl font-bold text-slate-900">One City, One Journey</h1>
          <p className="text-sm text-slate-500">Metro + BRTS + AMTS in one plan: real timetables, transfer walks, one fare, a fair split between operators.</p>
        </div>
        <Badge tone="green"><WifiOff className="size-3" /> runs on this phone</Badge>
      </div>

      <Card className="p-4">
        <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr_10rem]">
          <PlacePicker label="From" places={ix?.places || []} value={from} onChange={(p) => { setFrom(p); setPick(0) }} />
          <button type="button" title="Swap" onClick={() => { setFrom(to); setTo(from); setPick(0) }} className="mb-1 rounded-full border border-slate-300 p-2 hover:bg-slate-50"><ArrowUpDown className="size-4" /></button>
          <PlacePicker label="To" places={ix?.places || []} value={to} onChange={(p) => { setTo(p); setPick(0) }} />
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Leave at</span><TimeInput value={time} onChange={(v) => { setTime(v); setPick(0) }} /></label>
        </div>
        {!ix && <p className="mt-3 text-sm text-slate-500">Loading timetables (958 bus route patterns, 14,030 trips)…</p>}
        {ix && (!from || !to) && (
          <Button className="mt-3" onClick={() => { setFrom(byName('Naroda Gam')); setTo(byName('Shivranjani')); setTime('18:30'); setPick(0) }}>
            Try the sample trip: Naroda Gam → Shivranjani at 18:30
          </Button>
        )}
      </Card>

      {from && to && ix && !opts.length && (
        <Card className="p-4"><p className="font-semibold text-slate-900">No journey found after {time}.</p><p className="text-sm text-slate-600">The last bus or train may have gone, or the stop has no AMTS/BRTS service in our data. Try an earlier time or a nearby stop.</p></Card>
      )}

      {o && (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <div className="space-y-2">
            {opts.map((x, i) => (
              <button key={i} type="button" onClick={() => setPick(i)} className={`w-full rounded-2xl border bg-white p-3 text-left shadow-sm ${x === o ? 'border-red-500 ring-2 ring-red-500' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="mb-2 flex flex-wrap gap-1">{x.tags.map((t) => <Badge key={t} tone={t === 'Fastest' ? 'red' : 'slate'}>{t}</Badge>)}</div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{x.minutes} min</span>
                  <span className="text-2xl font-bold text-slate-900">{rs(x.split.oneFare)}</span>
                </div>
                <p className="mb-2 text-xs text-slate-500">{toHHMM(x.depart)} → {toHHMM(x.arrive)} · {x.transfers} change{x.transfers === 1 ? '' : 's'} · {x.walkMin} min walking</p>
                <Chips legs={x.legs} />
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <Card title={`${o.minutes} min · arrive ${toHHMM(o.arrive)} · one fare ${rs(o.split.oneFare)}`} subtitle={`${o.transfers} change${o.transfers === 1 ? '' : 's'}, ${o.walkMin} min of transfer walking (amber)`} className="p-4">
              <Steps o={o} from={from} to={to} />
            </Card>
            <Card title={`One ticket, ${rs(o.split.oneFare)}, split fairly`} subtitle="Bonus: fare-splitting logic between the operators" className="p-4">
              <FareSplit split={o.split} />
            </Card>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Data: AMTS + BRTS Janmarg GTFS (scheduled, not live GPS), metro lines and headways from GMRC (metro wait = half the average headway, an assumption),
        walks from stations to bus stops ≤600 m, other walks are straight line × 1.3 at 75 m/min (assumption). Gandhinagar GGTSL e-buses have no public timetable.
      </p>
    </div>
  )
}
