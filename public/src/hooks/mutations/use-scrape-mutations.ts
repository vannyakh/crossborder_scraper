import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, type SubmitJobsPayload } from '../../lib/api'
import { useScrapeStore } from '../../stores/scrape-store'

export function useSubmitJobsMutation() {
  const queryClient = useQueryClient()
  const setActiveBatchId = useScrapeStore((s) => s.setActiveBatchId)

  return useMutation({
    mutationFn: (payload: SubmitJobsPayload) =>
      api<{ batch_id: string; total: number }>('/jobs/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setActiveBatchId(data.batch_id)
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      void queryClient.invalidateQueries({ queryKey: ['batches'] })
    },
  })
}

export function useCancelBatchMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (batchId: string) =>
      api(`/jobs/${batchId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['batches'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}
