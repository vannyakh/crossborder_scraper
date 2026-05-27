import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, type PanelUpdateApply, type PanelUpdateStatus } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function usePanelUpdateStatusQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.gatewayUpdateStatus,
    queryFn: () => api<PanelUpdateStatus>('/gateway/update/status'),
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useApplyPanelUpdateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body?: {
      pull?: boolean
      browser?: boolean
      restart?: boolean
      branch?: string | null
    }) =>
      api<PanelUpdateApply>('/gateway/update/apply', {
        method: 'POST',
        body: JSON.stringify({
          pull: body?.pull ?? true,
          browser: body?.browser ?? true,
          restart: body?.restart ?? true,
          branch: body?.branch ?? null,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayUpdateStatus })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayStatus })
      void queryClient.invalidateQueries({ queryKey: queryKeys.health })
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceOverview })
    },
  })
}
