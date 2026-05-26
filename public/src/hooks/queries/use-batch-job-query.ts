import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type BatchReport, type BatchStatus } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'
import { useScrapeStore } from '../../stores/scrape-store'

export function useBatchStatusQuery(batchId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.batchStatus(batchId),
    queryFn: () => api<BatchStatus>(`/jobs/${batchId}/status`),
    enabled: isAuthenticated && Boolean(batchId),
    refetchInterval: (query) => (query.state.data?.running ? 1500 : false),
  })
}

export function useBatchResultQuery(batchId: string, enabled: boolean) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.batchResult(batchId),
    queryFn: () => api<BatchReport>(`/jobs/${batchId}/result`),
    enabled: isAuthenticated && Boolean(batchId) && enabled,
  })
}

export function useActiveBatchQuery() {
  const activeBatchId = useScrapeStore((s) => s.activeBatchId)
  const statusQuery = useBatchStatusQuery(activeBatchId)
  const resultQuery = useBatchResultQuery(
    activeBatchId,
    Boolean(statusQuery.data && !statusQuery.data.running),
  )

  return {
    batchId: activeBatchId,
    status: statusQuery.data,
    result: resultQuery.data,
    isLoading: statusQuery.isLoading,
    error: statusQuery.error ?? resultQuery.error,
    isRunning: statusQuery.data?.running ?? false,
  }
}
