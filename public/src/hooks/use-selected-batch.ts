import { useMemo } from 'react'
import { useBatchesQuery } from './queries/use-batches-query'
import { useBatchLiveQuery } from './queries/use-batch-job-query'
import { useUiStore } from '../stores/ui-store'

export function useSelectedBatchQuery() {
  const selectedBatchId = useUiStore((s) => s.selectedBatchId)
  const batchesQuery = useBatchesQuery()
  const live = useBatchLiveQuery(selectedBatchId)

  const summary = useMemo(
    () => batchesQuery.data?.items.find((b) => b.batch_id === selectedBatchId),
    [batchesQuery.data?.items, selectedBatchId],
  )

  const isRunning = live.isRunning || summary?.status === 'running'

  return {
    batchId: selectedBatchId,
    summary,
    status: live.status,
    results: live.results,
    isRunning,
    isConnected: live.isConnected,
    error: live.error,
    isLoading: Boolean(selectedBatchId) && !live.status && !live.error && batchesQuery.isLoading,
  }
}
