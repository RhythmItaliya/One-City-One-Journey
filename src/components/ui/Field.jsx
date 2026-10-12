import { cn } from './cn.js'

const control = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export const Input = ({ className, ...p }) => <input className={cn(control, className)} {...p} />
export const Textarea = ({ className, ...p }) => <textarea className={cn(control, 'min-h-24', className)} {...p} />

/** options: array of strings or { value, label } */
export function Select({ options = [], className, ...p }) {
  return (
    <select className={cn(control, className)} {...p}>
      {options.map((o) => {
        const { value, label } = typeof o === 'object' ? o : { value: o, label: o }
        return <option key={value} value={value}>{label}</option>
      })}
    </select>
  )
}
