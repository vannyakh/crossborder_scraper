import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys } from '../../lib/api'
import {
  mapProjectDetail,
  mapProjectSummary,
  type ApiProjectDetail,
  type ApiProjectList,
} from '../../lib/api/project-map'
import type {
  ProjectDetail,
  ProjectEnvironment,
} from '../../components/projects/project-sample-data'

export function useProjectsListQuery() {
  return useQuery({
    queryKey: queryKeys.projectsList,
    queryFn: async () => {
      const res = await api<ApiProjectList>('/projects')
      return {
        items: res.items.map(mapProjectSummary),
        total: res.total,
      }
    },
  })
}

export function useProjectQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    queryFn: async () => {
      const res = await api<ApiProjectDetail>(`/projects/${encodeURIComponent(projectId!)}`)
      return mapProjectDetail(res)
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; environment?: ProjectEnvironment }) => {
      const res = await api<ApiProjectDetail>('/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return mapProjectDetail(res)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projectsList })
    },
  })
}

export function useUpdateProjectFlowMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      projectId: string
      nodes: ProjectDetail['nodes']
      edges: ProjectDetail['edges']
      clientId?: string
    }) => {
      const { projectId, clientId, nodes, edges } = payload
      const res = await api<ApiProjectDetail>(`/projects/${encodeURIComponent(projectId)}/flow`, {
        method: 'PUT',
        body: JSON.stringify({ nodes, edges, client_id: clientId }),
      })
      return mapProjectDetail(res)
    },
    onSuccess: (data) => {
      void qc.setQueryData(queryKeys.project(data.id), data)
      void qc.invalidateQueries({ queryKey: queryKeys.projectsList })
    },
  })
}

export function useUpdateProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      projectId: string
      name?: string
      description?: string
      environment?: ProjectEnvironment
    }) => {
      const { projectId, ...body } = payload
      const res = await api<ApiProjectDetail>(`/projects/${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      return mapProjectDetail(res)
    },
    onSuccess: (data) => {
      void qc.setQueryData(queryKeys.project(data.id), data)
      void qc.invalidateQueries({ queryKey: queryKeys.projectsList })
    },
  })
}

export function useDeleteProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) =>
      api<{ ok: boolean }>(`/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' }),
    onSuccess: (_data, projectId) => {
      void qc.removeQueries({ queryKey: queryKeys.project(projectId) })
      void qc.invalidateQueries({ queryKey: queryKeys.projectsList })
    },
  })
}
