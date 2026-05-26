import { useScrapeStore } from '../../stores/scrape-store'
import { useBatchLive } from '../use-batch-live'

export function useActiveBatchQuery() {
  const activeBatchId = useScrapeStore((s) => s.activeBatchId)
  const live = useBatchLive(activeBatchId || null)

  return {
    batchId: activeBatchId,
    status: live.status,
    result: live.results.length > 0 || live.status
      ? {
          batch_id: activeBatchId,
          total: live.status?.total ?? live.results.length,
          success: live.status?.success ?? 0,
          failed: live.status?.failed ?? 0,
          results: live.results,
        }
      : undefined,
    isLoading: Boolean(activeBatchId) && !live.status && !live.error,
    error: live.error,
    isRunning: live.isRunning,
    isConnected: live.isConnected,
    liveResults: live.results,
  }
}

export function useBatchLiveQuery(batchId: string | null | undefined) {
  const live = useBatchLive(batchId)
  return {
    batchId: batchId ?? '',
    status: live.status,
    results: live.results,
    isRunning: live.isRunning,
    isConnected: live.isConnected,
    error: live.error,
  }
}
