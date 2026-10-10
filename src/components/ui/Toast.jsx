import { createStore } from '../../lib/store.js'
import { cn } from './cn.js'

const toastStore = createStore({ items: [] })

/** toast('Saved!') or toast('Oops', 'error'). Callable from anywhere. */
export function toast(message, tone = 'info', ms = 2800) {
  const id = Math.random().toString(36).slice(2)
  toastStore.set((s) => ({ items: [...s.items, { id, message, tone }] }))
  setTimeout(() => toastStore.set((s) => ({ items: s.items.filter((t) => t.id !== id) })), ms)
}

const TONES = { info: 'bg-slate-900 text-white', success: 'bg-emerald-600 text-white', error: 'bg-rose-600 text-white' }

/** Mount once (in Layout). */
export function Toaster() {
  const { items } = toastStore.use()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[3000] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {items.map((t) => (
        <div key={t.id} className={cn('pointer-events-auto rounded-xl px-4 py-2.5 text-sm shadow-lg', TONES[t.tone] || TONES.info)}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
