import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type ServiceSupport } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useServiceSupportQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.serviceSupport,
    queryFn: () => api<ServiceSupport>('/service/support'),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })
}
