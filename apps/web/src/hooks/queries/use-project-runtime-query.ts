import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type ProjectRuntimeResponse } from '../../lib/api'

export function useProjectRuntimeQuery(params: {
  projectId: string
  enabled?: boolean
  paused?: boolean
}) {
  const { projectId, enabled = true, paused = false } = params

  return useQuery({
    queryKey: queryKeys.projectRuntime(projectId),
    queryFn: () =>
      api<ProjectRuntimeResponse>(`/projects/${encodeURIComponent(projectId)}/runtime`),
    enabled: enabled && Boolean(projectId),
    refetchInterval: enabled && !paused ? 15_000 : false,
  })
}
