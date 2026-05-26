import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

const cardClass =
  'rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl shadow-black/35'

export function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<Record<string, unknown> | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!id) return
    void api<Record<string, unknown>>(`/products/${id}`)
      .then(setProduct)
      .catch((e) => setErr(String((e as Error).message || e)))
  }, [id])

  return (
    <div className={cardClass}>
      <Link to="/products" className="text-xs text-violet-300">
        ← Back to products
      </Link>
      <h2 className="mt-3 text-base font-bold">Product #{id}</h2>
      {err ? <p className="mt-2 text-xs text-rose-400">{err}</p> : null}
      {product ? (
        <pre className="mt-4 max-h-[70vh] overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-300">
          {JSON.stringify(product, null, 2)}
        </pre>
      ) : (
        !err && <p className="mt-4 text-xs text-slate-400">Loading…</p>
      )}
    </div>
  )
}
