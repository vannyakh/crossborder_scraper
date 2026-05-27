import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type LLMHealth, type LlmProviderInfo } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useLlmProvidersQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.llmProviders,
    queryFn: () => api<{ providers: LlmProviderInfo[] }>('/ai/providers'),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

export function useLLMHealthQuery(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.llmHealth,
    queryFn: () => api<LLMHealth>('/ai/health'),
    enabled: isAuthenticated && enabled,
    staleTime: 15_000,
    retry: false,
  })
}
