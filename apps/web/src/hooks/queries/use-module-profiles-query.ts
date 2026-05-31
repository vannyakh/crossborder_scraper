import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type ModuleProfileDetail, type ModuleProfileMeta } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useModuleMetaQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.moduleMeta,
    queryFn: () => api<ModuleProfileMeta>('/modules/meta'),
    enabled: isAuthenticated,
    staleTime: 120_000,
  })
}

export function useModuleProfileQuery(moduleId: string | null, enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.moduleProfile(moduleId ?? ''),
    queryFn: () => api<ModuleProfileDetail>(`/modules/${encodeURIComponent(moduleId ?? '')}`),
    enabled: isAuthenticated && enabled && Boolean(moduleId),
    staleTime: 120_000,
  })
}
