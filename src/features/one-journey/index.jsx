// One City, One Journey (PS-08): From + To + time -> AMTS/BRTS (real GTFS timetable) + Metro options with
// transfer walks, ONE fare and a fair split between operators. Everything runs on the phone (works offline).
// Prefill: /?from=Naroda Gam&to=Shivranjani&time=18:30   (a bus stop that shares a station's name is written as B:Name)
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, ArrowUpDown, WifiOff, Clock } from 'lucide-react'
import { Card, Badge, Button, cn } from '../../components/ui'
import { TimeInput, nowHHMM } from '../../components/blocks/Time.jsx'
import { toHHMM, toMin } from './metro.js'
import { plan } from './plan.js'
import { usePlanner } from './usePlanner.js'
import { rs, plural, PlaceIcon, PlaceTags, Chips, Steps, FareSplit } from './parts.jsx'

const SAMPLE = { from: 'Naroda Gam', to: 'Shivranjani', time: '18:30' }
const TAG_TONE = { Fastest: 'red' }

/** Type-ahead list of metro stations and bus stops. Up/Down move, Enter picks, Esc closes. */
function PlacePicker({ label, places, value, onChange }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const box = useRef(null)
  const id = useId()
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return places.filter((p) => p.kind === 'station').slice(0, 30)
    return places.filter((p) => p.name.toLowerCase().includes(s))
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'station' ? -1 : 1) || a.name.toLowerCase().indexOf(s) - b.name.toLowerCase().indexOf(s) || a.name.length - b.name.length)
      .slice(0, 30)
  }, [places, q])
  const stops = useMemo(() => places.filter((p) => p.kind !== 'station').length, [places])

  const close = () => { setOpen(false); setQ(''); setActive(0) }
  const choose = (p) => { onChange(p); close() }

  // Close when you tap or click anywhere else.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!box.current?.contains(e.target)) close() }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])
  useEffect(() => { if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [open, active, id])

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((n) => Math.min(n + 1, list.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((n) => Math.max(n - 1, 0)) }
    else if (e.key === 'Enter' && open && list[active]) { e.preventDefault(); choose(list[active]) }
    else if (e.key === 'Escape') close()
  }

  return (
    <div ref={box} className="relative">
      <label htmlFor={`${id}-input`} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {value && !open ? (
        <button type="button" id={`${id}-input`} onClick={() => setOpen(true)}
          className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-left text-sm shadow-sm hover:border-slate-400">
          <PlaceIcon p={value} /><span className="min-w-0 flex-1 truncate font-medium">{value.name}</span><PlaceTags p={value} />
          <span className="text-xs font-semibold text-sky-700">Change</span>
        </button>
      ) : (
        <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:border-sky-500">
          <Search className="size-4 shrink-0 text-slate-400" />
          <input id={`${id}-input`} autoFocus={open} value={q} autoComplete="off"
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0) }} onFocus={() => setOpen(true)} onKeyDown={onKey}
            role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && list[active] ? `${id}-${active}` : undefined}
            placeholder="Bus stop or metro station…" className="w-full py-0.5 text-sm outline-none" />
          {open && <button type="button" aria-label="Close the list" onClick={close}><X className="size-4 text-slate-400" /></button>}
        </div>
      )}
      {open && (
        <ul id={`${id}-list`} role="listbox" aria-label={label} className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {!q.trim() && <li role="presentation" className="px-3 py-1.5 text-xs text-slate-500">Metro stations. Type a name to search {stops.toLocaleString('en-GB')} bus stops too.</li>}
          {list.map((p, i) => (
            <li key={p.key} id={`${id}-${i}`} role="option" aria-selected={i === active}
              onClick={() => choose(p)} onMouseMove={() => i !== active && setActive(i)}
              className={cn('flex cursor-pointer items-center gap-2 px-3 py-2 text-sm', i === active && 'bg-slate-100')}>
              <PlaceIcon p={p} /><span className="min-w-0 flex-1 truncate">{p.name}</span><PlaceTags p={p} />
            </li>
          ))}
          {!list.length && <li role="presentation" className="px-3 py-2 text-sm text-slate-500">No stop or station called “{q.trim()}”.</li>}
        </ul>
      )}
    </div>
  )
}

function OptionCard({ x, selected, onPick }) {
  return (
    <button type="button" onClick={onPick} aria-pressed={selected}
      className={cn('w-full rounded-2xl border bg-white p-3 text-left shadow-sm transition', selected ? 'border-red-500 ring-2 ring-red-500' : 'border-slate-200 hover:border-slate-400')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-2xl font-bold text-slate-900">{x.minutes} min</span>
            {x.tags.map((t) => <Badge key={t} tone={TAG_TONE[t] || 'slate'}>{t}</Badge>)}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{toHHMM(x.depart)} → {toHHMM(x.arrive)} · {plural(x.transfers, 'change')} · {x.walkMin} min walking</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold text-slate-900">{rs(x.split.oneFare)}</p>
          <p className="text-xs text-slate-500">one fare</p>
        </div>
      </div>
      <div className="mt-2"><Chips legs={x.legs} /></div>
    </button>
  )
}

function Details({ o, from, to }) {
  return (
    <div className="space-y-4">
      <Card title={`Your journey: ${o.minutes} min, ${rs(o.split.oneFare)}`}
        subtitle={`Leave ${toHHMM(o.depart)}, arrive ${toHHMM(o.arrive)} · ${plural(o.transfers, 'change')} · ${o.walkMin} min walking (amber)`}>
        <Steps o={o} from={from} to={to} />
      </Card>
      <Card title={`One ticket, ${rs(o.split.oneFare)}, split fairly`} subtitle="Bonus: how the one fare is shared between the operators">
        <FareSplit split={o.split} legs={o.legs} />
      </Card>
    </div>
  )
}

export default function OneJourney() {
  const [sp, setSp] = useSearchParams()
  const { ix, facts, error } = usePlanner()
  // A URL value is a key (M:Name / B:Name) or a plain name; a plain name means the first match, and stations come first.
  const find = (v) => (v && ix ? ix.places.find((p) => p.key === v) || ix.places.find((p) => p.name.toLowerCase() === v.toLowerCase()) || null : null)
  const param = (p) => (find(p.name) === p ? p.name : p.key)
  // undefined = not chosen yet, so the URL decides.
  const [fromSel, setFrom] = useState()
  const [toSel, setTo] = useState()
  const [time, setTime] = useState(sp.get('time') || '')
  const [pick, setPick] = useState(0)
  const from = fromSel === undefined ? find(sp.get('from')) : fromSel
  const to = toSel === undefined ? find(sp.get('to')) : toSel
  const same = from && to && from.key === to.key
  const opts = useMemo(() => (ix && facts && from && to && time ? plan(ix, facts, from, to, toMin(time)) : []), [ix, facts, from, to, time])
  const o = opts[Math.min(pick, opts.length - 1)]

  // Keep the address bar in step with the form, so a reload or a shared link opens the same trip.
  const want = from && to && time ? new URLSearchParams({ from: param(from), to: param(to), time }).toString() : null
  useEffect(() => { if (want && want !== sp.toString()) setSp(want, { replace: true }) }, [want]) // eslint-disable-line

  const update = (fn) => { fn(); setPick(0) }
  const sample = () => update(() => { setFrom(find(SAMPLE.from)); setTo(find(SAMPLE.to)); setTime(SAMPLE.time) })

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">PS-08 · One City, One Journey</p>
        <h1 className="text-2xl font-bold text-slate-900">Plan a journey</h1>
        <p className="text-sm text-slate-500">Metro, BRTS and AMTS buses in one plan, with one fare for the whole trip.</p>
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_15rem] lg:items-end">
          <PlacePicker label="From" places={ix?.places || []} value={from} onChange={(p) => update(() => setFrom(p))} />
          <div className="-my-2 flex justify-end lg:my-0 lg:pb-1.5">
            <button type="button" aria-label="Swap From and To" disabled={!from && !to} onClick={() => update(() => { setFrom(to); setTo(from) })}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              <ArrowUpDown className="size-3.5 lg:rotate-90" /><span className="lg:sr-only">Swap</span>
            </button>
          </div>
          <PlacePicker label="To" places={ix?.places || []} value={to} onChange={(p) => update(() => setTo(p))} />
          <div>
            <label htmlFor="leave-at" className="mb-1.5 block text-sm font-medium text-slate-700">Leave at</label>
            <div className="flex gap-2">
              <TimeInput id="leave-at" className="h-10 min-w-0 flex-1" value={time} onChange={(v) => update(() => setTime(v))} />
              <Button variant="secondary" icon={Clock} onClick={() => update(() => setTime(nowHHMM()))}>Now</Button>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <p className="font-semibold">The timetables did not load.</p>
            <p>Connect to the internet and reload once. After that the app works with no signal.</p>
            <Button className="mt-2" variant="secondary" size="sm" onClick={() => window.location.reload()}>Reload</Button>
          </div>
        )}
        {!ix && !error && <p className="mt-3 text-sm text-slate-500">Loading timetables (958 bus route patterns, 14,030 trips)…</p>}
        {ix && (!from || !to) && (
          <Button className="mt-3" variant="secondary" onClick={sample}>Try the sample trip: {SAMPLE.from} → {SAMPLE.to} at {SAMPLE.time}</Button>
        )}
      </Card>

      {same && (
        <Card><p className="font-semibold text-slate-900">From and To are the same place.</p><p className="text-sm text-slate-600">Pick a different stop or station for one of them.</p></Card>
      )}

      {from && to && ix && facts && !same && !opts.length && (
        <Card>
          <p className="font-semibold text-slate-900">No journey found after {time}.</p>
          <p className="text-sm text-slate-600">The last bus or train may have gone, or the stop has no AMTS/BRTS service in our data. Try an earlier time or a nearby stop.</p>
        </Card>
      )}

      {o && (
        <>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{from.name} → {to.name}</h2>
            <p className="text-sm text-slate-500">{plural(opts.length, 'option')} · leave {time} · one fare covers every leg</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <div className="space-y-2">
              {opts.map((x, i) => (
                <div key={i} className="space-y-2">
                  <OptionCard x={x} selected={x === o} onPick={() => setPick(i)} />
                  {/* On a phone the details open under the chosen option. */}
                  {x === o && <div className="pb-2 lg:hidden"><Details o={o} from={from} to={to} /></div>}
                </div>
              ))}
            </div>
            <div className="hidden lg:block"><Details o={o} from={from} to={to} /></div>
          </div>
        </>
      )}

      <p className="flex gap-2 text-xs text-slate-500">
        <WifiOff className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Works with no signal after the first visit. Timetables are stored on the phone.
          Data: AMTS + BRTS Janmarg GTFS (scheduled, not live GPS), metro lines and headways from GMRC (metro wait = half the average headway, an assumption),
          walks from stations to bus stops ≤600 m, other walks are straight line × 1.3 at 75 m/min (assumption). Gandhinagar GGTSL e-buses have no public timetable.
        </span>
      </p>
    </div>
  )
}
