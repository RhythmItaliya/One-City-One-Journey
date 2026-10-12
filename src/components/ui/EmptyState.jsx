import { Inbox } from 'lucide-react'

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
      <Icon className="size-8 text-slate-400" />
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
