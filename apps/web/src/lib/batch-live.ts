import type { BatchStatus, JobResult } from '../lib/api/types'

export function jobResultFromStream(data: Record<string, unknown>): JobResult {
  return {
    job_id: String(data.job_id ?? ''),
    url: String(data.url ?? ''),
    status: (data.status as JobResult['status']) ?? 'failed',
    error: (data.error as string | null | undefined) ?? null,
    duration_seconds: Number(data.duration_seconds ?? 0),
    ai_used: Boolean(data.ai_used),
    proxy_used: (data.proxy_used as string | null | undefined) ?? null,
    product: data.product_title ? { title: String(data.product_title) } : null,
  }
}

export function statusFromStream(data: Record<string, unknown>): BatchStatus {
  return {
    started_at: String(data.started_at ?? ''),
    running: Boolean(data.running),
    completed: Number(data.completed ?? 0),
    total: Number(data.total ?? 0),
    success: Number(data.success ?? 0),
    failed: Number(data.failed ?? 0),
    status: String(data.status ?? (data.running ? 'running' : 'completed')),
  }
}

export function isTerminalBatchEvent(event: string): boolean {
  return event === 'batch_complete' || event === 'batch_cancelled' || event === 'batch_failed'
}
