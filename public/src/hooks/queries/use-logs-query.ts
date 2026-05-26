import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, type LogCategory, type ServiceLogListResponse } from '../../lib/api'

export function useLogsQuery(params: {
  category: LogCategory
  q: string
  limit: number
  offset: number
}) {
  const { category, q, limit, offset } = params
  const search = new URLSearchParams({
    category,
    limit: String(limit),
    offset: String(offset),
  })
  if (q.trim()) search.set('q', q.trim())

  return useQuery({
    queryKey: queryKeys.logs(category, q, limit, offset),
    queryFn: () => api<ServiceLogListResponse>(`/logs?${search.toString()}`),
    refetchInterval: 15_000,
  })
}

export function useClearLogsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (category: LogCategory) =>
      api<{ message: string; ok: boolean }>(`/logs?category=${category}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}
