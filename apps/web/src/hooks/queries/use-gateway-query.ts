import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type GatewayStatus, type RuntimeStatus } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useGatewayStatusQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.gatewayStatus,
    queryFn: () => api<GatewayStatus>('/gateway/status'),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })
}

export function useGatewayRuntime(): RuntimeStatus | undefined {
  const { data } = useGatewayStatusQuery()
  return data?.runtime
}
