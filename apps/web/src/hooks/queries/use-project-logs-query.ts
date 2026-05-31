import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type LogCategory, type ServiceLogListResponse } from '../../lib/api'

export function useProjectLogsQuery(params: {
  projectId: string
  category: LogCategory
  q?: string
  since?: string
  limit?: number
  enabled?: boolean
  paused?: boolean
}) {
  const { projectId, category, q = '', since, limit = 200, enabled = true, paused = false } = params
  const search = new URLSearchParams({
    category,
    limit: String(limit),
    offset: '0',
  })
  if (q.trim()) search.set('q', q.trim())
  if (since) search.set('since', since)

  return useQuery({
    queryKey: queryKeys.projectLogs(projectId, category, q, limit, since),
    queryFn: () =>
      api<ServiceLogListResponse>(
        `/projects/${encodeURIComponent(projectId)}/logs?${search.toString()}`,
      ),
    enabled: enabled && Boolean(projectId),
    refetchInterval: enabled && !paused ? 15_000 : false,
  })
}
