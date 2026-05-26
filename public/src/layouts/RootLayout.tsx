import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api, type Stats } from '../lib/api'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-violet-500/20 text-violet-200'
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
  ].join(' ')

export function RootLayout() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    void api<Stats>('/stats')
      .then(setStats)
      .catch(() => setStats(null))
    const id = window.setInterval(() => {
      void api<Stats>('/stats')
        .then(setStats)
        .catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 pb-16">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight">Crossborder Scraper</h1>
          <p className="mt-1 text-xs text-slate-400">
            Server-managed scraping, storage, and export
            {stats ? (
              <>
                {' '}
                · {stats.products} products · {stats.batches} batches
                {stats.running_batches > 0 ? ` · ${stats.running_batches} running` : ''}
              </>
            ) : null}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-1">
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/batches" className={navLinkClass}>
            Batches
          </NavLink>
          <NavLink to="/products" className={navLinkClass}>
            Products
          </NavLink>
          <NavLink to="/files" className={navLinkClass}>
            Files
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
