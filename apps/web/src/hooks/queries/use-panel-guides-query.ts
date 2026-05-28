import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type PanelGuideDetail, type PanelGuideList } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function usePanelGuidesQuery(category?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const query = category ? `?category=${encodeURIComponent(category)}` : ''

  return useQuery({
    queryKey: queryKeys.panelGuides(category),
    queryFn: () => api<PanelGuideList>(`/guides${query}`),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

export function usePanelGuideQuery(guideId: string | null, enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.panelGuide(guideId ?? ''),
    queryFn: () => api<PanelGuideDetail>(`/guides/${encodeURIComponent(guideId ?? '')}`),
    enabled: isAuthenticated && enabled && Boolean(guideId),
    staleTime: 60_000,
  })
}
