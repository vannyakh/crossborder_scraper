import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type BatchReport, type BatchSummary } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useBatchesQuery(limit = 50) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.batches(limit),
    queryFn: () => api<{ items: BatchSummary[]; total: number }>(`/batches?limit=${limit}`),
    enabled: isAuthenticated,
    refetchInterval: 5_000,
  })
}

export function useBatchDetailQuery(batchId: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.batch(batchId ?? ''),
    queryFn: () => api<BatchReport>(`/batches/${batchId}`),
    enabled: isAuthenticated && Boolean(batchId),
  })
}
