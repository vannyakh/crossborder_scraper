import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  queryKeys,
  type DatabaseInstallOptionsResponse,
  type DatabaseProviderInfo,
  type StoreCreateDatabasesRequest,
  type StoreManagedDatabaseResponse,
  type DatabaseQueryRequest,
  type DatabaseQueryResponse,
  type DatabaseSqlCompleteResponse,
  type DatabaseColumnsResponse,
  type DatabaseCreateTableRequest,
  type DatabaseAddColumnRequest,
  type DatabaseInsertRowRequest,
  type DatabaseActionResponse,
  type DatabaseTablesResponse,
  type StoreDatabasePatchRequest,
  type StoreUpdateConfigRequest,
  type StoreInstalled,
} from '../../lib/api'
import { managedDatabaseQueryKey } from '../../lib/databases/registry'

export const databaseProvidersQueryKey = ['store', 'database-providers'] as const

export const databaseInstallOptionsQueryKey = (pluginId: string) =>
  [...databaseProvidersQueryKey, pluginId, 'install-options'] as const

export function useDatabaseInstallOptionsQuery(pluginId: string | null, enabled = true) {
  return useQuery({
    queryKey: databaseInstallOptionsQueryKey(pluginId ?? ''),
    queryFn: () =>
      api<DatabaseInstallOptionsResponse>(`/store/database-providers/${pluginId}/install-options`),
    enabled: Boolean(pluginId) && enabled,
    staleTime: 60_000,
  })
}

export function useDatabaseProvidersQuery() {
  return useQuery({
    queryKey: databaseProvidersQueryKey,
    queryFn: () =>
      api<{ items: DatabaseProviderInfo[]; total: number }>('/store/database-providers').then(
        (r) => r.items,
      ),
    staleTime: 30_000,
  })
}

export function useManagedDatabaseQuery(pluginId: string | null, enabled = true) {
  return useQuery({
    queryKey: managedDatabaseQueryKey(pluginId ?? ''),
    queryFn: () => api<StoreManagedDatabaseResponse>(`/store/plugins/${pluginId}/databases`),
    enabled: Boolean(pluginId) && enabled,
    refetchInterval: 15_000,
  })
}

export function useCreateLogicalDatabaseMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pluginId,
      databases,
    }: {
      pluginId: string
      databases: StoreCreateDatabasesRequest['databases']
    }) =>
      api<StoreManagedDatabaseResponse>(`/store/plugins/${pluginId}/databases`, {
        method: 'POST',
        body: JSON.stringify({ databases }),
      }),
    onSuccess: (_data, { pluginId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.storeInstalled })
      void qc.invalidateQueries({ queryKey: queryKeys.storeCatalog })
      void qc.invalidateQueries({ queryKey: queryKeys.storePlugin(pluginId) })
      void qc.invalidateQueries({ queryKey: managedDatabaseQueryKey(pluginId) })
      void qc.invalidateQueries({ queryKey: databaseProvidersQueryKey })
    },
  })
}

function invalidateManagedDatabase(qc: ReturnType<typeof useQueryClient>, pluginId: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.storeInstalled })
  void qc.invalidateQueries({ queryKey: queryKeys.storeCatalog })
  void qc.invalidateQueries({ queryKey: queryKeys.storePlugin(pluginId) })
  void qc.invalidateQueries({ queryKey: managedDatabaseQueryKey(pluginId) })
  void qc.invalidateQueries({ queryKey: databaseProvidersQueryKey })
}

export const databaseTablesQueryKey = (pluginId: string, databaseName: string) =>
  [...managedDatabaseQueryKey(pluginId), databaseName, 'tables'] as const

export function useDatabaseTablesQuery(
  pluginId: string | null,
  databaseName: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: databaseTablesQueryKey(pluginId ?? '', databaseName ?? ''),
    queryFn: () =>
      api<DatabaseTablesResponse>(
        `/store/plugins/${pluginId}/databases/${encodeURIComponent(databaseName ?? '')}/tables`,
      ),
    enabled: Boolean(pluginId && databaseName) && enabled,
    staleTime: 30_000,
  })
}

export function useDatabaseQueryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pluginId,
      databaseName,
      body,
    }: {
      pluginId: string
      databaseName: string
      body: DatabaseQueryRequest
    }) =>
      api<DatabaseQueryResponse>(
        `/store/plugins/${pluginId}/databases/${encodeURIComponent(databaseName)}/query`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: (_data, { pluginId, databaseName }) => {
      void qc.invalidateQueries({
        queryKey: databaseTablesQueryKey(pluginId, databaseName),
      })
    },
  })
}

export const databaseSqlCompleteQueryKey = (
  pluginId: string,
  databaseName: string,
  prefix: string,
  table?: string | null,
) =>
  [...databaseTablesQueryKey(pluginId, databaseName), 'sql-complete', prefix, table ?? ''] as const

export function useDatabaseSqlCompleteQuery(
  pluginId: string,
  databaseName: string,
  prefix: string,
  tableName: string | null | undefined,
  enabled = true,
) {
  const params = new URLSearchParams({ prefix })
  if (tableName) params.set('table', tableName)
  return useQuery({
    queryKey: databaseSqlCompleteQueryKey(pluginId, databaseName, prefix, tableName),
    queryFn: () =>
      api<DatabaseSqlCompleteResponse>(
        `/store/plugins/${pluginId}/databases/${encodeURIComponent(databaseName)}/sql-complete?${params}`,
      ),
    enabled: Boolean(pluginId && databaseName && prefix.length > 0) && enabled,
    staleTime: 5_000,
  })
}

export const databaseColumnsQueryKey = (
  pluginId: string,
  databaseName: string,
  tableName: string,
) => [...databaseTablesQueryKey(pluginId, databaseName), 'columns', tableName] as const

export function useDatabaseColumnsQuery(
  pluginId: string | null,
  databaseName: string | null,
  tableName: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: databaseColumnsQueryKey(pluginId ?? '', databaseName ?? '', tableName ?? ''),
    queryFn: () =>
      api<DatabaseColumnsResponse>(
        `/store/plugins/${pluginId}/databases/${encodeURIComponent(databaseName ?? '')}/tables/${encodeURIComponent(tableName ?? '')}/columns`,
      ),
    enabled: Boolean(pluginId && databaseName && tableName) && enabled,
    staleTime: 30_000,
  })
}

export function useCreateDatabaseTableMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pluginId,
      databaseName,
      body,
    }: {
      pluginId: string
      databaseName: string
      body: DatabaseCreateTableRequest
    }) =>
      api<DatabaseActionResponse>(
        `/store/plugins/${pluginId}/databases/${encodeURIComponent(databaseName)}/tables`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: (_data, { pluginId, databaseName }) => {
      void qc.invalidateQueries({ queryKey: databaseTablesQueryKey(pluginId, databaseName) })
    },
  })
}

export function useAddTableColumnMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pluginId,
      databaseName,
      tableName,
      body,
    }: {
      pluginId: string
      databaseName: string
      tableName: string
      body: DatabaseAddColumnRequest
    }) =>
      api<DatabaseActionResponse>(
        `/store/plugins/${pluginId}/databases/${encodeURIComponent(databaseName)}/tables/${encodeURIComponent(tableName)}/columns`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: (_data, { pluginId, databaseName, tableName }) => {
      void qc.invalidateQueries({ queryKey: databaseTablesQueryKey(pluginId, databaseName) })
      void qc.invalidateQueries({
        queryKey: databaseColumnsQueryKey(pluginId, databaseName, tableName),
      })
    },
  })
}

export function useInsertTableRowMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pluginId,
      databaseName,
      tableName,
      body,
    }: {
      pluginId: string
      databaseName: string
      tableName: string
      body: DatabaseInsertRowRequest
    }) =>
      api<DatabaseActionResponse>(
        `/store/plugins/${pluginId}/databases/${encodeURIComponent(databaseName)}/tables/${encodeURIComponent(tableName)}/rows`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: (_data, { pluginId, databaseName }) => {
      void qc.invalidateQueries({ queryKey: databaseTablesQueryKey(pluginId, databaseName) })
    },
  })
}

export function useOptimizeDatabaseMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pluginId, databaseName }: { pluginId: string; databaseName: string }) =>
      api<{ plugin_id: string; name: string; optimized: boolean }>(
        `/store/plugins/${pluginId}/databases/${encodeURIComponent(databaseName)}/optimize`,
        { method: 'POST' },
      ),
    onSuccess: (_data, { pluginId }) => invalidateManagedDatabase(qc, pluginId),
  })
}

export function usePatchLogicalDatabaseMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pluginId,
      databaseName,
      body,
    }: {
      pluginId: string
      databaseName: string
      body: StoreDatabasePatchRequest
    }) =>
      api<StoreManagedDatabaseResponse>(
        `/store/plugins/${pluginId}/databases/${encodeURIComponent(databaseName)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      ),
    onSuccess: (_data, { pluginId }) => invalidateManagedDatabase(qc, pluginId),
  })
}

export function useUpdateDatabaseConfigMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pluginId, body }: { pluginId: string; body: StoreUpdateConfigRequest }) =>
      api<StoreInstalled>(`/store/plugins/${pluginId}/config`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, { pluginId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.storeCatalog })
      void qc.invalidateQueries({ queryKey: queryKeys.storeInstalled })
      void qc.invalidateQueries({ queryKey: queryKeys.storePlugin(pluginId) })
      void qc.invalidateQueries({ queryKey: managedDatabaseQueryKey(pluginId) })
      void qc.invalidateQueries({ queryKey: databaseProvidersQueryKey })
      void qc.invalidateQueries({
        queryKey: [...queryKeys.storePlugin(pluginId), 'credentials'],
      })
    },
  })
}
