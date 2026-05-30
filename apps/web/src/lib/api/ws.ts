import { getBasicAuthHeader, useAuthStore } from '../../stores/auth-store'
import { isTerminalBatchEvent } from '../batch-live'
import { withPanelPrefix } from './panel-prefix'

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
  const path = withPanelPrefix(`/jobs/${encodeURIComponent(batchId)}/ws`)
  return `${protocol}//${window.location.host}${path}${qs ? `?${qs}` : ''}`
}

export function buildProjectWsUrl(projectId: string, clientId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const params = new URLSearchParams({ client_id: clientId })
  const auth = getBasicAuthHeader().Authorization
  if (auth) params.set('authorization', auth)
  const path = withPanelPrefix(`/projects/${encodeURIComponent(projectId)}/ws`)
  return `${protocol}//${window.location.host}${path}?${params.toString()}`
}

export type ProjectWsConnection = {
  close: () => void
  send: (payload: Record<string, unknown>) => void
}

/** Long-lived project canvas collaboration socket (presence + flow sync). */
export function connectProjectWebSocket(
  projectId: string,
  clientId: string,
  handlers: { onEvent: RealtimeHandler; onOpen?: () => void; signal?: AbortSignal },
): ProjectWsConnection {
  const ws = new WebSocket(buildProjectWsUrl(projectId, clientId))

  const onAbort = () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, 'aborted')
    }
  }

  handlers.signal?.addEventListener('abort', onAbort)

  ws.onopen = () => {
    handlers.onOpen?.()
  }

  ws.onmessage = (ev) => {
    try {
      const frame = JSON.parse(String(ev.data)) as WsFrame
      handlers.onEvent(frame.event ?? 'message', frame.data)
    } catch {
      /* ignore malformed frames */
    }
  }

  ws.onerror = () => {
    handlers.onEvent('error', { message: 'WebSocket connection failed' })
  }

  ws.onclose = (ev) => {
    handlers.signal?.removeEventListener('abort', onAbort)
    if (ev.code === 4401) {
      useAuthStore.getState().logout()
    }
    handlers.onEvent('close', { code: ev.code, reason: ev.reason })
  }

  return {
    close: () => {
      handlers.signal?.removeEventListener('abort', onAbort)
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'closed')
      }
    },
    send: (payload) => {
      if (ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify(payload))
    },
  }
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
      finish(() => reject(new Error(`WebSocket closed (${ev.code}): ${ev.reason || 'unknown'}`)))
    }
  })
}
