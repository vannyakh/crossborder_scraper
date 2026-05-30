import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type LogCategory, type ServiceLogListResponse } from '../../lib/api'

export function useProjectLogsQuery(params: {
  projectId: string
  category: LogCategory
  q?: string
  limit?: number
  enabled?: boolean
  paused?: boolean
}) {
  const { projectId, category, q = '', limit = 200, enabled = true, paused = false } = params
  const search = new URLSearchParams({
    category,
    limit: String(limit),
    offset: '0',
  })
  if (q.trim()) search.set('q', q.trim())

  return useQuery({
    queryKey: queryKeys.projectLogs(projectId, category, q, limit),
    queryFn: () =>
      api<ServiceLogListResponse>(
        `/projects/${encodeURIComponent(projectId)}/logs?${search.toString()}`,
      ),
    enabled: enabled && Boolean(projectId),
    refetchInterval: enabled && !paused ? 15_000 : false,
  })
}
