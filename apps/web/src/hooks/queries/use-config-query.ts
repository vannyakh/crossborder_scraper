import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type Config } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useConfigQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.config,
    queryFn: () => api<Config>('/config'),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}
