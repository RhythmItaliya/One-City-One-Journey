import { NavLink, Outlet } from 'react-router-dom'
import { Wifi, WifiOff } from 'lucide-react'
import { APP_NAME, APP_TAGLINE } from './config.js'
import { NAV } from './nav.js'
import { useOnline } from './lib/useOnline.js'
import { Badge, Toaster, cn } from './components/ui'

function TopBar() {
  const online = useOnline()
  return (
    <header className="sticky top-0 z-[1000] flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:hidden">
        <Logo />
        <span className="truncate font-semibold">{APP_NAME}</span>
      </div>
      <div className="hidden text-sm text-slate-500 md:block">{APP_TAGLINE}</div>
      <div className="flex items-center gap-2">
        <Badge tone={online ? 'green' : 'red'}>
          {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {online ? 'ONLINE' : 'OFFLINE'}
        </Badge>
      </div>
    </header>
  )
}

const Logo = () => (
  <div className="grid size-8 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-sky-400">1</div>
)

export default function Layout() {
  return (
    <div className="flex h-full">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
          <Logo />
          <span className="truncate text-[15px] font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-xs text-slate-400">Works offline after first load</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-[1000] flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn('flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium', isActive ? 'text-slate-900' : 'text-slate-400')
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Toaster />
    </div>
  )
}
