import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, type BatchReport, type BatchStatus, type JobResult } from '../lib/api'
import { connectBatchStream } from '../lib/api/sse'
import { isTerminalBatchEvent, jobResultFromStream, statusFromStream } from '../lib/batch-live'
import { useAuthStore } from '../stores/auth-store'

type BatchLiveState = {
  status: BatchStatus | null
  results: JobResult[]
  isRunning: boolean
  isConnected: boolean
  error: string | null
}

const idleState: BatchLiveState = {
  status: null,
  results: [],
  isRunning: false,
  isConnected: false,
  error: null,
}

export function useBatchLive(batchId: string | null | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()
  const [state, setState] = useState<BatchLiveState>(idleState)
  const resultsRef = useRef<JobResult[]>([])

  const reset = useCallback(() => {
    resultsRef.current = []
    setState(idleState)
  }, [])

  useEffect(() => {
    if (!batchId || !isAuthenticated) {
      reset()
      return
    }

    const abort = new AbortController()
    let active = true

    const bootstrap = async () => {
      try {
        const status = await api<BatchStatus>(`/jobs/${batchId}/status`)
        if (!active) return
        setState((prev) => ({
          ...prev,
          status,
          isRunning: status.running,
          error: null,
        }))

        if (!status.running) {
          const report = await api<BatchReport>(`/jobs/${batchId}/result`)
          if (!active) return
          setState((prev) => ({
            ...prev,
            status,
            results: report.results ?? [],
            isRunning: false,
            isConnected: false,
          }))
          return
        }

        await connectBatchStream(batchId, {
          signal: abort.signal,
          onEvent: (event, raw) => {
            if (!active) return
            const data = (raw ?? {}) as Record<string, unknown>

            if (event === 'status' || isTerminalBatchEvent(event)) {
              const nextStatus = statusFromStream(data)
              setState((prev) => ({
                ...prev,
                status: nextStatus,
                isRunning: nextStatus.running,
                isConnected: true,
                error: null,
              }))
            }

            if (event === 'job_done') {
              const job = jobResultFromStream(data)
              resultsRef.current = [...resultsRef.current, job]
              setState((prev) => ({
                ...prev,
                results: resultsRef.current,
                isConnected: true,
              }))
            }

            if (isTerminalBatchEvent(event)) {
              void (async () => {
                try {
                  const report = await api<BatchReport>(`/jobs/${batchId}/result`)
                  if (!active) return
                  setState((prev) => ({
                    ...prev,
                    status: prev.status
                      ? { ...prev.status, running: false, status: String(data.status ?? event) }
                      : statusFromStream(data),
                    results: report.results ?? resultsRef.current,
                    isRunning: false,
                    isConnected: false,
                  }))
                  queryClient.setQueryData(queryKeys.batchResult(batchId), report)
                  void queryClient.invalidateQueries({ queryKey: ['batches'] })
                  void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
                } catch {
                  setState((prev) => ({ ...prev, isRunning: false, isConnected: false }))
                }
              })()
            }
          },
        })

        if (active) {
          setState((prev) => ({ ...prev, isConnected: false, isRunning: false }))
        }
      } catch (err) {
        if (!active || abort.signal.aborted) return
        setState((prev) => ({
          ...prev,
          error: String((err as Error).message || err),
          isConnected: false,
        }))
      }
    }

    resultsRef.current = []
    setState({ ...idleState, isRunning: true })
    void bootstrap()

    return () => {
      active = false
      abort.abort()
    }
  }, [batchId, isAuthenticated, queryClient, reset])

  return state
}
