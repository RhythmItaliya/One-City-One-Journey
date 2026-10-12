import { cn } from './cn.js'

/** tabs: [{ id, label }]. Controlled: value + onChange. */
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('inline-flex rounded-xl bg-slate-100 p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition',
            value === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
