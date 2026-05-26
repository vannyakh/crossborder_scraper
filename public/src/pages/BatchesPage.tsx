import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type BatchReport } from '../lib/api'

const cardClass =
  'rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl shadow-black/35'

type BatchSummary = {
  batch_id: string
  status: string
  total: number
  completed: number
  success: number
  failed: number
  started_at: string
  finished_at: string | null
}

export function BatchesPage() {
  const [items, setItems] = useState<BatchSummary[]>([])
  const [selected, setSelected] = useState<BatchReport | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setErr('')
    try {
      const data = await api<{ items: BatchSummary[] }>('/batches?limit=50')
      setItems(data.items)
    } catch (e) {
      setErr(String((e as Error).message || e))
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 3000)
    return () => window.clearInterval(id)
  }, [load])

  async function openBatch(batchId: string) {
    try {
      const detail = await api<BatchReport>(`/batches/${batchId}`)
      setSelected(detail)
    } catch (e) {
      setErr(String((e as Error).message || e))
    }
  }

  async function cancel(batchId: string) {
    await api(`/jobs/${batchId}/cancel`, { method: 'POST' })
    void load()
  }

  const statusColor = (s: string) =>
    s === 'running'
      ? 'text-amber-400'
      : s === 'completed'
        ? 'text-emerald-400'
        : s === 'cancelled'
          ? 'text-slate-400'
          : 'text-rose-400'

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <section className={`${cardClass} min-w-0 flex-1`}>
        <h2 className="text-base font-bold">Batch history</h2>
        <p className="mt-1 text-xs text-slate-400">All scrape runs persisted by the server</p>
        {err ? <p className="mt-2 text-xs text-rose-400">{err}</p> : null}

        <ul className="mt-4 grid gap-2">
          {items.map((b) => (
            <li
              key={b.batch_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/3 p-3"
            >
              <button
                type="button"
                className="text-left"
                onClick={() => void openBatch(b.batch_id)}
              >
                <span className="font-mono text-sm">{b.batch_id}</span>
                <span className={`ml-2 text-xs ${statusColor(b.status)}`}>{b.status}</span>
                <p className="mt-1 text-xs text-slate-400">
                  {b.success}/{b.total} ok · {new Date(b.started_at).toLocaleString()}
                </p>
              </button>
              {b.status === 'running' ? (
                <button
                  type="button"
                  className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-400"
                  onClick={() => void cancel(b.batch_id)}
                >
                  Cancel
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {items.length === 0 ? (
          <p className="mt-4 text-xs text-slate-400">No batches yet.</p>
        ) : null}
      </section>

      {selected ? (
        <section className={`${cardClass} min-w-0 flex-1`}>
          <h2 className="text-base font-bold">Batch {selected.batch_id}</h2>
          <p className="mt-1 text-xs text-slate-400">
            <Link to="/" className="text-violet-300">
              Submit more jobs
            </Link>
          </p>
          <ul className="mt-4 max-h-[60vh] grid gap-2 overflow-auto">
            {(selected.results || []).map((r) => (
              <li key={r.job_id} className="rounded-lg border border-white/10 p-2 text-xs">
                <span className={r.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                  {r.status}
                </span>{' '}
                <span className="break-all text-slate-300">{r.url}</span>
                {r.product?.title ? (
                  <p className="mt-1 text-slate-400">{r.product.title}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
