import { getBasicAuthHeader, useAuthStore } from '../../stores/auth-store'
import { isTerminalBatchEvent } from '../batch-live'

export type RealtimeHandler = (event: string, data: unknown) => void

type WsFrame = {
  event?: string
  data?: unknown
}

export function buildBatchWsUrl(batchId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const params = new URLSearchParams()
  const auth = getBasicAuthHeader().Authorization
  if (auth) params.set('authorization', auth)
  const qs = params.toString()
  return `${protocol}//${window.location.host}/jobs/${encodeURIComponent(batchId)}/ws${qs ? `?${qs}` : ''}`
}

export function connectBatchWebSocket(
  batchId: string,
  handlers: { onEvent: RealtimeHandler; signal?: AbortSignal },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(buildBatchWsUrl(batchId))
    let settled = false

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      fn()
    }

    const onAbort = () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'aborted')
      }
    }

    const cleanup = () => {
      handlers.signal?.removeEventListener('abort', onAbort)
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
    }

    handlers.signal?.addEventListener('abort', onAbort)

    ws.onmessage = (ev) => {
      try {
        const frame = JSON.parse(String(ev.data)) as WsFrame
        const eventType = frame.event ?? 'message'
        handlers.onEvent(eventType, frame.data)
        if (isTerminalBatchEvent(eventType)) {
          ws.close(1000, 'complete')
        }
      } catch {
        /* ignore malformed frames */
      }
    }

    ws.onerror = () => {
      finish(() => reject(new Error('WebSocket connection failed')))
    }

    ws.onclose = (ev) => {
      if (handlers.signal?.aborted) {
        finish(() => resolve())
        return
      }
      if (ev.code === 4401) {
        useAuthStore.getState().logout()
        finish(() => reject(new Error('Unauthorized')))
        return
      }
      if (ev.code === 1000) {
        finish(() => resolve())
        return
      }
      finish(() =>
        reject(new Error(`WebSocket closed (${ev.code}): ${ev.reason || 'unknown'}`)),
      )
    }
  })
}
