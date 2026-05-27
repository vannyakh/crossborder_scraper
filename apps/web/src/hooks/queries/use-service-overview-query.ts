import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type ServiceOverview } from '../../lib/api'

export function useServiceOverviewQuery() {
  return useQuery({
    queryKey: queryKeys.serviceOverview,
    queryFn: () => api<ServiceOverview>('/service/overview'),
    refetchInterval: 10_000,
  })
}
