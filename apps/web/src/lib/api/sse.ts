import { getBasicAuthHeader, useAuthStore } from '../../stores/auth-store'

export type SSEHandler = (event: string, data: unknown) => void

export async function connectBatchStream(
  batchId: string,
  handlers: { onEvent: SSEHandler; signal?: AbortSignal },
): Promise<void> {
  const res = await fetch(`/jobs/${batchId}/stream`, {
    headers: {
      Accept: 'text/event-stream',
      ...getBasicAuthHeader(),
    },
    signal: handlers.signal,
  })

  if (res.status === 401) {
    useAuthStore.getState().logout()
    throw new Error('Unauthorized')
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`SSE HTTP ${res.status}: ${text}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      if (!frame.trim()) continue
      let eventType = 'message'
      let dataLine = ''
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) eventType = line.slice(6).trim()
        if (line.startsWith('data:')) dataLine = line.slice(5).trim()
      }
      if (!dataLine) continue
      try {
        handlers.onEvent(eventType, JSON.parse(dataLine))
      } catch {
        handlers.onEvent(eventType, dataLine)
      }
    }
  }
}
