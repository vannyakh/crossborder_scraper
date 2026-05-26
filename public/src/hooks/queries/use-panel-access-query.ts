import { useQuery } from '@tanstack/react-query'
import { publicApi, queryKeys, type PanelAccess } from '../../lib/api'

export function usePanelAccessQuery() {
  return useQuery({
    queryKey: queryKeys.panelAccess,
    queryFn: () => publicApi<PanelAccess>('/panel/access'),
    staleTime: 60_000,
    retry: 2,
  })
}
