import { useEffect } from 'react'

export type Config = {
  max_concurrent_jobs: number
  proxy_list_path: string
  proxy_rotation_strategy: string
  ai_enabled: boolean
  ai_fallback: boolean
  ai_model: string
  cookies_dir: string
  output_dir: string
  db_path: string
}

export type BatchStatus = {
  started_at: string
  running: boolean
  completed: number
  total: number
  success: number
  failed: number
}

export type JobResult = {
  job_id: string
  url: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
  error?: string | null
  duration_seconds?: number
  proxy_used?: string | null
  ai_used?: boolean
  product?: { title?: string | null } | null
}

export type BatchReport = {
  batch_id: string
  total: number
  success: number
  failed: number
  results: JobResult[]
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const detail =
      typeof data === 'object' && data !== null && 'detail' in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : JSON.stringify(data)
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${detail}`)
  }
  return data as T
}

export function useInterval(cb: () => void, delayMs: number | null) {
  useEffect(() => {
    if (delayMs == null) return
    const id = window.setInterval(cb, delayMs)
    return () => window.clearInterval(id)
  }, [cb, delayMs])
}
