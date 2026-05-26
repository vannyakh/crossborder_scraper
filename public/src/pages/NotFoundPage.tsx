import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-8 text-center shadow-xl">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="mt-2 text-sm text-slate-400">Page not found.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-xl border border-violet-400/30 bg-violet-500/80 px-4 py-2 text-sm font-semibold text-white"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
