import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys } from '../../lib/api'

export function useDockerStatusQuery() {
  return useQuery({
    queryKey: queryKeys.dockerStatus,
    queryFn: () => api<import('../../lib/api').DockerStatus>('/docker/status'),
    refetchInterval: 15_000,
  })
}

export function useDockerConfigQuery() {
  return useQuery({
    queryKey: queryKeys.dockerConfig,
    queryFn: () => api<import('../../lib/api').DockerConfig>('/docker/config'),
  })
}

export function useDockerContainersQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dockerContainers,
    queryFn: () => api<import('../../lib/api').DockerContainerList>('/docker/containers'),
    enabled,
    refetchInterval: enabled ? 10_000 : false,
  })
}

export function useDockerHubQuery(query: string) {
  const q = query.trim()
  const search = new URLSearchParams()
  if (q) search.set('q', q)
  search.set('limit', '24')

  return useQuery({
    queryKey: queryKeys.dockerHub(q),
    queryFn: () => api<import('../../lib/api').DockerHubList>(`/docker/hub?${search.toString()}`),
    staleTime: 60_000,
  })
}

export function useDockerInstallMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<import('../../lib/api').DockerInstallResult>('/docker/install', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dockerStatus })
      void qc.invalidateQueries({ queryKey: queryKeys.storeEnvironment })
    },
  })
}

export function useDockerServiceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action: 'start' | 'stop' | 'restart') =>
      api<import('../../lib/api').DockerServiceResult>(`/docker/service/${action}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dockerStatus })
      void qc.invalidateQueries({ queryKey: queryKeys.dockerContainers })
      void qc.invalidateQueries({ queryKey: queryKeys.storeEnvironment })
    },
  })
}

export function useDockerConfigMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      patch: Partial<import('../../lib/api').DockerConfig> & { registry_mirror?: string },
    ) =>
      api<import('../../lib/api').DockerConfig>('/docker/config', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dockerConfig })
    },
  })
}

export function useDockerContainerActionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'start' | 'stop' | 'restart' | 'remove' }) =>
      api<{ ok: boolean; message: string }>(
        `/docker/containers/${encodeURIComponent(id)}/${action}`,
        {
          method: 'POST',
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dockerContainers })
      void qc.invalidateQueries({ queryKey: queryKeys.dockerStatus })
    },
  })
}

export function useDockerRunMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { image: string; name?: string; port?: number; host_port?: number }) =>
      api<import('../../lib/api').DockerRunResult>('/docker/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dockerContainers })
    },
  })
}
