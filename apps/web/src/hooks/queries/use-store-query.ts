import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  queryKeys,
  type StoreCatalogItem,
  type StoreConnectRequest,
  type StoreEnvironment,
  type StoreInstalled,
  type StorePluginDetail,
} from '../../lib/api'

export function useStoreEnvironmentQuery() {
  return useQuery({
    queryKey: queryKeys.storeEnvironment,
    queryFn: () => api<StoreEnvironment>('/store/environment'),
  })
}

export function useStoreCatalogQuery() {
  return useQuery({
    queryKey: queryKeys.storeCatalog,
    queryFn: () =>
      api<{ items: StoreCatalogItem[]; total: number }>('/store/catalog').then((r) => r.items),
    refetchInterval: 15_000,
  })
}

export function useStoreInstalledQuery() {
  return useQuery({
    queryKey: queryKeys.storeInstalled,
    queryFn: () =>
      api<{ items: StoreInstalled[]; total: number }>('/store/installed').then((r) => r.items),
    refetchInterval: 10_000,
  })
}

export function useStoreInstallMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pluginId, port }: { pluginId: string; port?: number }) =>
      api<StoreInstalled>(`/store/plugins/${pluginId}/install`, {
        method: 'POST',
        body: JSON.stringify({ mode: 'docker', port }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.storeCatalog })
      void qc.invalidateQueries({ queryKey: queryKeys.storeInstalled })
    },
  })
}

export function useStoreConnectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pluginId, body }: { pluginId: string; body: StoreConnectRequest }) =>
      api<StoreInstalled>(`/store/plugins/${pluginId}/connect`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.storeCatalog })
      void qc.invalidateQueries({ queryKey: queryKeys.storeInstalled })
    },
  })
}

export function useStoreLifecycleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pluginId, action }: { pluginId: string; action: 'start' | 'stop' | 'restart' }) =>
      api<StoreInstalled>(`/store/plugins/${pluginId}/${action}`, { method: 'POST' }),
    onSuccess: (_data, { pluginId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.storeInstalled })
      void qc.invalidateQueries({ queryKey: queryKeys.storeCatalog })
      void qc.invalidateQueries({ queryKey: queryKeys.storePlugin(pluginId) })
    },
  })
}

export function useStoreUninstallMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pluginId: string) =>
      api<{ message: string }>(`/store/plugins/${pluginId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.storeCatalog })
      void qc.invalidateQueries({ queryKey: queryKeys.storeInstalled })
    },
  })
}

export function useStoreRefreshMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pluginId: string) => api<StoreInstalled>(`/store/plugins/${pluginId}/status`),
    onSuccess: (_data, pluginId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.storeInstalled })
      void qc.invalidateQueries({ queryKey: queryKeys.storeCatalog })
      void qc.invalidateQueries({ queryKey: queryKeys.storePlugin(pluginId) })
    },
  })
}

export function useStorePluginDetailQuery(pluginId: string | null) {
  return useQuery({
    queryKey: queryKeys.storePlugin(pluginId ?? ''),
    queryFn: () => api<StorePluginDetail>(`/store/plugins/${pluginId}`),
    enabled: Boolean(pluginId),
  })
}
