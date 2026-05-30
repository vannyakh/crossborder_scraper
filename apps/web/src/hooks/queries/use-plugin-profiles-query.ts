import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type PluginProfileCatalogResponse } from '../../lib/api'

export function usePluginProfilesQuery() {
  return useQuery({
    queryKey: queryKeys.pluginProfiles,
    queryFn: () => api<PluginProfileCatalogResponse>('/projects/plugin-profiles/catalog'),
    staleTime: 60_000,
  })
}
