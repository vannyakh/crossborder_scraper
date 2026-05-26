import { useEffect, useMemo, useState } from 'react'
import {
  api,
  type BatchReport,
  type BatchStatus,
  type Config,
  useInterval,
} from '../lib/api'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-slate-100 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20'

export function DashboardPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [urlsText, setUrlsText] = useState(
    'https://detail.1688.com/offer/XXXXXXXX.html\nhttps://www.aliexpress.com/item/YYYYYYYY.html',
  )
  const [workers, setWorkers] = useState<number>(3)
  const [useAi, setUseAi] = useState<boolean>(false)
  const [save, setSave] = useState<boolean>(true)

  const [batchId, setBatchId] = useState<string>('')
  const [status, setStatus] = useState<BatchStatus | null>(null)
  const [result, setResult] = useState<BatchReport | null>(null)
  const [busy, setBusy] = useState<boolean>(false)
  const [err, setErr] = useState<string>('')

  const urls = useMemo(
    () =>
      urlsText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('#')),
    [urlsText],
  )

  async function loadConfig() {
    try {
      const c = await api<Config>('/config')
      setConfig(c)
      if (typeof c.max_concurrent_jobs === 'number') setWorkers(c.max_concurrent_jobs)
    } catch (e) {
      setErr(String((e as Error).message || e))
    }
  }

  async function loadStatus(id: string) {
    if (!id) return
    try {
      const s = await api<BatchStatus>(`/jobs/${id}/status`)
      setStatus(s)
      if (!s.running) {
        const r = await api<BatchReport>(`/jobs/${id}/result`)
        setResult(r)
      }
    } catch (e) {
      setErr(String((e as Error).message || e))
    }
  }

  useEffect(() => {
    void loadConfig()
  }, [])

  useInterval(() => {
    if (batchId) void loadStatus(batchId)
  }, batchId ? 1500 : null)

  async function submit() {
    setErr('')
    setBusy(true)
    setStatus(null)
    setResult(null)
    try {
      const payload = { urls, workers: Number(workers) || null, use_ai: useAi, save }
      const resp = await api<{ batch_id: string; total: number }>('/jobs/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setBatchId(resp.batch_id)
      await loadStatus(resp.batch_id)
    } catch (e) {
      setErr(String((e as Error).message || e))
    } finally {
      setBusy(false)
    }
  }

  const apiReady = Boolean(config)

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <span
          className={[
            'rounded-full border px-2.5 py-1 text-xs font-medium',
            apiReady
              ? 'border-emerald-500/30 text-emerald-400'
              : 'border-rose-500/30 text-rose-400',
          ].join(' ')}
        >
          {apiReady ? 'API ready' : 'API not ready'}
        </span>
      </div>

      <div className="flex flex-wrap gap-3.5">
        <section className="min-w-[min(100%,320px)] flex-1 basis-[520px] rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl shadow-black/35">
          <h2 className="text-base font-bold">Submit jobs</h2>
          <p className="mt-1 text-xs text-slate-400">
            Paste product URLs (one per line). The API runs Playwright workers with cookies/proxies.
          </p>

          <label className="mt-3 block text-xs text-slate-400">URLs</label>
          <textarea
            className={`${inputClass} min-h-[140px] resize-y`}
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
          />

          <div className="mt-3 flex flex-wrap gap-3">
            <div className="min-w-[140px] flex-1">
              <label className="block text-xs text-slate-400">Workers</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={workers}
                onChange={(e) => setWorkers(Number(e.target.value))}
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="block text-xs text-slate-400">AI extraction</label>
              <select
                className={inputClass}
                value={useAi ? 'true' : 'false'}
                onChange={(e) => setUseAi(e.target.value === 'true')}
              >
                <option value="false">Auto / Disabled</option>
                <option value="true">Force AI</option>
              </select>
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              className="rounded border-white/20"
              checked={save}
              onChange={(e) => setSave(e.target.checked)}
            />
            Save results (SQLite + JSON)
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-xl border border-violet-400/30 bg-linear-to-b from-violet-500/95 to-violet-600/75 px-3 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
              disabled={busy || urls.length === 0}
              onClick={() => void submit()}
            >
              {busy ? 'Submitting...' : `Submit (${urls.length})`}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-xl border border-white/10 bg-white/6 px-3 py-2.5 text-sm font-bold text-slate-200"
              onClick={() => {
                setBatchId('')
                setStatus(null)
                setResult(null)
                setErr('')
              }}
            >
              Clear
            </button>
          </div>

          {err ? (
            <>
              <hr className="my-3.5 border-white/10" />
              <p className="text-xs text-rose-400">{err}</p>
            </>
          ) : null}
        </section>

        <section className="min-w-[min(100%,320px)] flex-1 basis-[520px] rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl shadow-black/35">
          <h2 className="text-base font-bold">Engine config</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat label="Workers default" value={config?.max_concurrent_jobs ?? '—'} />
            <Stat
              label="Proxy list"
              value={config?.proxy_list_path ?? '—'}
              mono
              small
            />
            <Stat label="AI enabled" value={String(config?.ai_enabled ?? false)} />
          </dl>

          <hr className="my-3.5 border-white/10" />

          <h2 className="text-base font-bold">Batch</h2>
          <p className="mt-1 text-xs text-slate-400">Current batch id:</p>
          <p className="mt-1.5 break-all font-mono text-sm">{batchId || '—'}</p>

          <hr className="my-3.5 border-white/10" />

          <dl className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Completed"
              value={status ? `${status.completed}/${status.total}` : '—'}
            />
            <Stat label="Success" value={status?.success ?? '—'} valueClass="text-emerald-400" />
            <Stat label="Failed" value={status?.failed ?? '—'} valueClass="text-rose-400" />
          </dl>

          {status?.running ? (
            <p className="mt-2.5 text-xs text-slate-400">Running… auto-refresh every 1.5s</p>
          ) : null}
        </section>
      </div>

      <section className="mt-3.5 w-full rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl shadow-black/35">
        <h2 className="text-base font-bold">Results</h2>
        <p className="mt-1 text-xs text-slate-400">When the batch finishes, results appear here.</p>
        <hr className="my-3.5 border-white/10" />

        {!result ? (
          <p className="text-xs text-slate-400">No results yet.</p>
        ) : (
          <ul className="grid gap-2.5">
            {result.results.map((r) => (
              <li
                key={r.job_id}
                className="rounded-xl border border-white/10 bg-white/3 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-all text-sm text-slate-100/95">{r.url}</p>
                  <span
                    className={[
                      'shrink-0 rounded-full border px-2 py-0.5 text-xs',
                      r.status === 'success'
                        ? 'border-emerald-500/30 text-emerald-400'
                        : 'border-rose-500/30 text-rose-400',
                    ].join(' ')}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2.5 text-xs text-slate-400">
                  <span>
                    job: <span className="font-mono">{r.job_id}</span>
                  </span>
                  <span>t: {r.duration_seconds ?? 0}s</span>
                  <span>
                    proxy: <span className="font-mono">{r.proxy_used || '—'}</span>
                  </span>
                  <span>ai: {String(Boolean(r.ai_used))}</span>
                  {r.product?.title ? (
                    <span>title: {r.product.title.slice(0, 80)}</span>
                  ) : null}
                  {r.error ? <span className="text-rose-400">error: {r.error}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 text-xs text-slate-400">
        Tip: multi-account cookies with{' '}
        <code className="font-mono text-slate-300">python main.py login 1688 --session seller_a</code>
        , proxies in <code className="font-mono text-slate-300">config/proxies.txt</code>.
      </p>
    </>
  )
}

function Stat({
  label,
  value,
  mono,
  small,
  valueClass = '',
}: {
  label: string
  value: string | number
  mono?: boolean
  small?: boolean
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-3">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd
        className={[
          'mt-1 font-black',
          small ? 'text-xs' : 'text-xl',
          mono ? 'font-mono break-all' : '',
          valueClass,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
