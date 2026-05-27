import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type MarketplaceInfo, type RuntimeStatus } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useRuntimeStatusQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.runtimeStatus,
    queryFn: () => api<RuntimeStatus>('/runtime/status'),
    enabled: isAuthenticated,
    refetchInterval: 5_000,
  })
}

export function useMarketplacesQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.marketplaces,
    queryFn: () => api<{ items: MarketplaceInfo[] }>('/export/marketplaces'),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}
