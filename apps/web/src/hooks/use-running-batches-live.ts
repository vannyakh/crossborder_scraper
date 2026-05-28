import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  api,
  connectBatchWebSocket,
  queryKeys,
  type BatchReport,
  type BatchStatus,
  type JobResult,
} from '../lib/api'
import { isTerminalBatchEvent, jobResultFromStream, statusFromStream } from '../lib/batch-live'
import {
  createMonitorEvent,
  MONITOR_EVENT_SKIP,
  type LiveMonitorEvent,
} from '../lib/monitor-events'
import { useAuthStore } from '../stores/auth-store'

export type BatchLiveSnapshot = {
  status: BatchStatus | null
  results: JobResult[]
  isRunning: boolean
  isConnected: boolean
  error: string | null
}

const MAX_EVENTS = 120

const emptySnapshot: BatchLiveSnapshot = {
  status: null,
  results: [],
  isRunning: false,
  isConnected: false,
  error: null,
}

export function useRunningBatchesLive(batchIds: string[]) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()
  const [byBatch, setByBatch] = useState<Record<string, BatchLiveSnapshot>>({})
  const [events, setEvents] = useState<LiveMonitorEvent[]>([])
  const resultsRefs = useRef<Record<string, JobResult[]>>({})

  const pushEvent = useCallback((event: LiveMonitorEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS))
  }, [])

  const batchKey = batchIds.slice().sort().join(',')

  useEffect(() => {
    if (!isAuthenticated || !batchIds.length) {
      setByBatch({})
      return
    }

    const abort = new AbortController()
    let active = true

    const patchBatch = (batchId: string, patch: Partial<BatchLiveSnapshot>) => {
      setByBatch((prev) => ({
        ...prev,
        [batchId]: { ...(prev[batchId] ?? emptySnapshot), ...patch },
      }))
    }

    const onStreamEvent = (batchId: string, event: string, raw: unknown) => {
      if (!active) return
      const data = (raw ?? {}) as Record<string, unknown>

      if (!MONITOR_EVENT_SKIP.has(event)) {
        pushEvent(createMonitorEvent(batchId, event, data))
      }

      if (event === 'status' || isTerminalBatchEvent(event)) {
        const nextStatus = statusFromStream(data)
        patchBatch(batchId, {
          status: nextStatus,
          isRunning: nextStatus.running,
          isConnected: true,
          error: null,
        })
      }

      if (event === 'job_done') {
        const job = jobResultFromStream(data)
        resultsRefs.current[batchId] = [...(resultsRefs.current[batchId] ?? []), job]
        patchBatch(batchId, {
          results: resultsRefs.current[batchId],
          isConnected: true,
        })
      }

      if (isTerminalBatchEvent(event)) {
        void (async () => {
          try {
            const report = await api<BatchReport>(`/jobs/${batchId}/result`)
            if (!active) return
            patchBatch(batchId, {
              status: statusFromStream({
                ...data,
                running: false,
                status: String(data.status ?? event),
              }),
              results: report.results ?? resultsRefs.current[batchId] ?? [],
              isRunning: false,
              isConnected: false,
            })
            queryClient.setQueryData(queryKeys.batchResult(batchId), report)
            void queryClient.invalidateQueries({ queryKey: ['batches'] })
            void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
            void queryClient.invalidateQueries({ queryKey: queryKeys.monitorStatus })
          } catch {
            patchBatch(batchId, { isRunning: false, isConnected: false })
          }
        })()
      }
    }

    const connectBatch = async (batchId: string) => {
      resultsRefs.current[batchId] = []
      patchBatch(batchId, { ...emptySnapshot, isRunning: true })

      try {
        const status = await api<BatchStatus>(`/jobs/${batchId}/status`)
        if (!active) return
        patchBatch(batchId, { status, isRunning: status.running, error: null })

        if (!status.running) {
          const report = await api<BatchReport>(`/jobs/${batchId}/result`)
          if (!active) return
          resultsRefs.current[batchId] = report.results ?? []
          patchBatch(batchId, {
            status,
            results: resultsRefs.current[batchId],
            isRunning: false,
            isConnected: false,
          })
          return
        }

        await connectBatchWebSocket(batchId, {
          signal: abort.signal,
          onEvent: (event, data) => onStreamEvent(batchId, event, data),
        })

        if (active) {
          patchBatch(batchId, { isConnected: false, isRunning: false })
        }
      } catch (err) {
        if (!active || abort.signal.aborted) return
        patchBatch(batchId, {
          error: String((err as Error).message || err),
          isConnected: false,
        })
      }
    }

    void Promise.all(batchIds.map((id) => connectBatch(id)))

    return () => {
      active = false
      abort.abort()
    }
  }, [batchKey, batchIds, isAuthenticated, pushEvent, queryClient])

  const connectedCount = batchIds.filter((id) => byBatch[id]?.isConnected).length

  return {
    byBatch,
    events,
    connectedCount,
    socketCount: batchIds.length,
  }
}
