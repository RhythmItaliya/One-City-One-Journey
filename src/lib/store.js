import { useSyncExternalStore } from 'react'

// Tiny global store: createStore(initial) -> { get, set, subscribe, use() }
export function createStore(initial) {
  let state = initial
  const subs = new Set()
  const get = () => state
  const set = (patch) => {
    state = typeof patch === 'function' ? patch(state) : { ...state, ...patch }
    subs.forEach((fn) => fn())
  }
  const subscribe = (fn) => (subs.add(fn), () => subs.delete(fn))
  const use = () => useSyncExternalStore(subscribe, get, get)
  return { get, set, subscribe, use }
}
