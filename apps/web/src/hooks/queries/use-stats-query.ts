import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type Stats } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useStatsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api<Stats>('/stats'),
    enabled: isAuthenticated,
    refetchInterval: 5_000,
  })
}
