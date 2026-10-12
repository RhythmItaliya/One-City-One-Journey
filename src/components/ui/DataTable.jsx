import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { EmptyState } from './EmptyState.jsx'

/**
 * rows: array of objects. columns (optional): [{ key, label, render?(row), align? }]
 * If columns is omitted, they are inferred from the first row's keys.
 */
export function DataTable({ rows = [], columns, onRowClick, empty = 'No rows' }) {
  const cols = columns || Object.keys(rows[0] || {}).map((key) => ({ key, label: key }))
  const [sort, setSort] = useState({ key: null, dir: 1 })

  const sorted = useMemo(() => {
    if (!sort.key) return rows
    return [...rows].sort((a, b) => {
      const x = a[sort.key], y = b[sort.key]
      if (x == null) return 1
      if (y == null) return -1
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir
    })
  }, [rows, sort])

  if (!rows.length) return <EmptyState title={empty} />

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {cols.map((c) => (
              <th key={c.key} className={`px-4 py-2.5 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                <button className="inline-flex items-center gap-1 hover:text-slate-900" onClick={() => toggle(c.key)}>
                  {c.label}
                  {sort.key === c.key && (sort.dir === 1 ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((row, i) => (
            <tr key={row.id ?? i} onClick={onRowClick && (() => onRowClick(row))} className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}>
              {cols.map((c) => (
                <td key={c.key} className={`px-4 py-2.5 text-slate-700 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.render ? c.render(row) : String(row[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
