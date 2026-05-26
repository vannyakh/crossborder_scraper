import { NavLink, Outlet } from 'react-router-dom'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-violet-500/20 text-violet-200'
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
  ].join(' ')

export function RootLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-7 pb-16">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight">Crossborder Scraper</h1>
          <p className="mt-1 text-xs text-slate-400">Monitor scrape jobs and engine config</p>
        </div>
        <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-1">
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
