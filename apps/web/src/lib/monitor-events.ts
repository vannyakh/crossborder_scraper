export type LiveMonitorEvent = {
  id: string
  at: number
  batchId: string
  type: string
  message: string
}

let eventSeq = 0

export function summarizeMonitorEvent(
  type: string,
  data: Record<string, unknown>,
): string {
  switch (type) {
    case 'heartbeat':
      return 'Connection alive'
    case 'job_done': {
      const status = String(data.status ?? 'unknown')
      const url = String(data.url ?? data.job_id ?? 'job')
      const short = url.length > 56 ? `${url.slice(0, 53)}…` : url
      return status === 'success' ? `Completed · ${short}` : `Failed · ${short}`
    }
    case 'status':
      return `Progress ${data.completed ?? 0}/${data.total ?? 0} · ${data.success ?? 0} ok`
    case 'batch_complete':
      return `Batch finished · ${data.success ?? 0}/${data.total ?? 0} succeeded`
    case 'batch_cancelled':
      return 'Batch cancelled'
    case 'batch_failed':
      return `Batch failed · ${data.failed ?? 0} errors`
    default:
      return type
  }
}

export function createMonitorEvent(
  batchId: string,
  type: string,
  data: Record<string, unknown>,
): LiveMonitorEvent {
  eventSeq += 1
  return {
    id: `${batchId}-${eventSeq}-${Date.now()}`,
    at: Date.now(),
    batchId,
    type,
    message: summarizeMonitorEvent(type, data),
  }
}

export const MONITOR_EVENT_SKIP = new Set(['heartbeat'])
