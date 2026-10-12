import { cn } from './cn.js'

export function StatTile({ label, value, hint, icon: Icon, trend, className }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
        {Icon && <Icon className="size-4 text-slate-400" />}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {(hint || trend) && (
        <div className="mt-1 text-xs text-slate-500">
          {trend && <span className={trend.startsWith('-') ? 'text-rose-600' : 'text-emerald-600'}>{trend} </span>}
          {hint}
        </div>
      )}
    </div>
  )
}
