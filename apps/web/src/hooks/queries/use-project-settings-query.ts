import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  queryKeys,
  type ProjectSettingsResponse,
  type ProjectSettingsVariable,
  type ProjectTokenCreateResponse,
  type ProjectVisibility,
} from '../../lib/api'

export function useProjectSettingsQuery(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectSettings(projectId),
    queryFn: () =>
      api<ProjectSettingsResponse>(`/projects/${encodeURIComponent(projectId)}/settings`),
    enabled: Boolean(projectId),
  })
}

export function usePatchProjectSettingsMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      projectId: string
      visibility?: ProjectVisibility
      variables?: ProjectSettingsVariable[]
    }) => {
      const { projectId, ...body } = payload
      return api<ProjectSettingsResponse>(`/projects/${encodeURIComponent(projectId)}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    },
    onSuccess: (data) => {
      void qc.setQueryData(queryKeys.projectSettings(data.project_id), data)
    },
  })
}

export function useCreateProjectTokenMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { projectId: string; label: string }) => {
      const { projectId, label } = payload
      return api<ProjectTokenCreateResponse>(
        `/projects/${encodeURIComponent(projectId)}/settings/tokens`,
        { method: 'POST', body: JSON.stringify({ label }) },
      )
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.projectSettings(variables.projectId) })
    },
  })
}

export function useRevokeProjectTokenMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { projectId: string; tokenId: string }) => {
      const { projectId, tokenId } = payload
      return api<{ ok: boolean }>(
        `/projects/${encodeURIComponent(projectId)}/settings/tokens/${encodeURIComponent(tokenId)}`,
        { method: 'DELETE' },
      )
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.projectSettings(variables.projectId) })
    },
  })
}
