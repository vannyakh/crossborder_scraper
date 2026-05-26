import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type PanelConfig } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function usePanelConfigQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.panelConfig,
    queryFn: () => api<PanelConfig>('/config/panel'),
    enabled: isAuthenticated,
    staleTime: 30_000,
  })
}
