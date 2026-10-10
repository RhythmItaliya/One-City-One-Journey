// Usage: <TimeInput value={t} onChange={setT} />   <Countdown to="18:45" />
import { useEffect, useState } from 'react'

const pad = (n) => String(n).padStart(2, '0')
export const nowHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }

/** Controlled HH:MM input. If value is empty it shows the current time. */
export function TimeInput({ value, onChange, className = '' }) {
  useEffect(() => { if (!value) onChange?.(nowHHMM()) }, []) // eslint-disable-line
  return (
    <input
      type="time"
      value={value || nowHHMM()}
      onChange={(e) => onChange?.(e.target.value)}
      className={`rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 ${className}`}
    />
  )
}

/** Seconds from now until today's HH:MM (negative if it has passed). */
export function secondsUntil(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const t = new Date(); t.setHours(h, m, 0, 0)
  return Math.round((t - Date.now()) / 1000)
}

/** mm:ss countdown to `to` (HH:MM). Turns red under `warnSec` (default 120 s). */
export function Countdown({ to, warnSec = 120, className = '' }) {
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(i) }, [])
  if (!to) return null
  const s = secondsUntil(to)
  const neg = s < 0
  const a = Math.abs(s)
  const text = `${neg ? '-' : ''}${a >= 3600 ? `${Math.floor(a / 3600)}:` : ''}${pad(Math.floor((a % 3600) / 60))}:${pad(a % 60)}`
  const tone = neg ? 'text-slate-400' : s < warnSec ? 'text-rose-600' : 'text-slate-900'
  return <span className={`font-mono text-3xl font-semibold tabular-nums ${tone} ${className}`}>{text}</span>
}
