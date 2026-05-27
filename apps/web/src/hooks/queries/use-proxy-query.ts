import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProxyStatus, testProxyEgress } from '../../lib/api/proxy-settings'
import { queryKeys } from '../../lib/api/query-keys'

export function useProxyStatusQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.proxyStatus,
    queryFn: fetchProxyStatus,
    enabled,
    refetchInterval: 30_000,
  })
}

export function useTestProxyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: testProxyEgress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.proxyStatus })
    },
  })
}
