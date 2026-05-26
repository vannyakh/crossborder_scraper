import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type AIConfig, type LLMHealth } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useAIConfigQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.aiConfig,
    queryFn: () => api<AIConfig>('/ai/config'),
    enabled: isAuthenticated,
    staleTime: 30_000,
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
