import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys } from '../../lib/api'
import type {
  ApiProjectRunListResponse,
  ApiProjectRunRecord,
  ApiProjectRunResponse,
  ApiProjectRunStatus,
} from '../../lib/api/project-map'

const TERMINAL_STATUSES: ApiProjectRunStatus[] = ['completed', 'failed', 'stopped']

/** Start a full flow run or a single-node execution. */
export function useProjectRunMutation(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { node_id?: string }) => {
      return api<ApiProjectRunResponse>(`/projects/${encodeURIComponent(projectId)}/run`, {
        method: 'POST',
        body: JSON.stringify({ node_id: payload.node_id ?? null }),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projectRuns(projectId) })
    },
  })
}

/** Stop an active run. */
export function useProjectRunStopMutation(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      return api<{ ok: boolean }>(
        `/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/stop`,
        { method: 'POST' },
      )
    },
    onSuccess: (_data, runId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.projectRun(projectId, runId) })
      void qc.invalidateQueries({ queryKey: queryKeys.projectRuns(projectId) })
    },
  })
}

/**
 * Poll a specific run until it reaches a terminal state.
 * Pass `null` runId to disable.
 */
export function useProjectRunQuery(projectId: string, runId: string | null) {
  return useQuery({
    queryKey: queryKeys.projectRun(projectId, runId ?? ''),
    queryFn: async () =>
      api<ApiProjectRunRecord>(
        `/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId!)}`,
      ),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || TERMINAL_STATUSES.includes(status)) return false
      return 800
    },
  })
}

/** List recent runs for a project. */
export function useProjectRunsQuery(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectRuns(projectId),
    queryFn: async () =>
      api<ApiProjectRunListResponse>(`/projects/${encodeURIComponent(projectId)}/runs`),
    enabled,
  })
}
