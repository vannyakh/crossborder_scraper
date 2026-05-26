import { useQuery } from '@tanstack/react-query'
import { checkHealth, queryKeys } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useHealthQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.health,
    queryFn: checkHealth,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    retry: 1,
  })
}
