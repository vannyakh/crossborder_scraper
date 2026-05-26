import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ProductSummary } from '../lib/api'

const cardClass =
  'rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl shadow-black/35'

export function ProductsPage() {
  const [items, setItems] = useState<ProductSummary[]>([])
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const data = await api<{ items: ProductSummary[]; total: number }>('/products?limit=100')
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setErr(String((e as Error).message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(id: number) {
    if (!confirm('Delete this product from the database?')) return
    await api(`/products/${id}`, { method: 'DELETE' })
    void load()
  }

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Products</h2>
          <p className="mt-1 text-xs text-slate-400">
            Scraped products stored in SQLite ({total} total)
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      {err ? <p className="mt-3 text-xs text-rose-400">{err}</p> : null}
      {loading ? <p className="mt-4 text-xs text-slate-400">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="mt-4 text-xs text-slate-400">No products yet. Run a scrape from the dashboard.</p>
      ) : null}

      <ul className="mt-4 grid gap-2">
        {items.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-white/10 bg-white/3 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-100">{p.title}</p>
                <p className="mt-1 break-all text-xs text-slate-400">{p.source_url}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {p.source} · {p.source_product_id} · updated {new Date(p.updated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  to={`/products/${p.id}`}
                  className="rounded-lg border border-violet-500/30 px-2 py-1 text-xs text-violet-300"
                >
                  View
                </Link>
                <button
                  type="button"
                  className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-400"
                  onClick={() => void remove(p.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
