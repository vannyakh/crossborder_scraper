import { useCallback, useEffect, useState } from 'react'
import { api, formatBytes, type FileEntry } from '../lib/api'

const cardClass =
  'rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl shadow-black/35'

export function FilesPage() {
  const [items, setItems] = useState<FileEntry[]>([])
  const [outputDir, setOutputDir] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setErr('')
    try {
      const data = await api<{ items: FileEntry[]; output_dir: string }>('/files')
      setItems(data.items)
      setOutputDir(data.output_dir)
    } catch (e) {
      setErr(String((e as Error).message || e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(path: string) {
    if (!confirm(`Delete ${path}?`)) return
    await api(`/files/${encodeURIComponent(path)}`, { method: 'DELETE' })
    void load()
  }

  return (
    <div className={cardClass}>
      <h2 className="text-base font-bold">Output files</h2>
      <p className="mt-1 text-xs text-slate-400">
        JSON and raw HTML under <code className="font-mono text-slate-300">{outputDir || 'data/output'}</code>
      </p>
      {err ? <p className="mt-2 text-xs text-rose-400">{err}</p> : null}

      <ul className="mt-4 grid gap-2">
        {items.map((f) => (
          <li
            key={f.path}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/3 p-3 text-sm"
          >
            <div className="min-w-0">
              <p className="font-mono text-slate-200">{f.path}</p>
              <p className="text-xs text-slate-500">
                {f.kind} · {formatBytes(f.size_bytes)} · {new Date(f.modified_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/files/${f.path}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-violet-500/30 px-2 py-1 text-xs text-violet-300"
              >
                Open
              </a>
              <button
                type="button"
                className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-400"
                onClick={() => void remove(f.path)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="mt-4 text-xs text-slate-400">No output files yet.</p>
      ) : null}
    </div>
  )
}
