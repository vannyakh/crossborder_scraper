import { useQuery } from '@tanstack/react-query'
import {
  api,
  queryKeys,
  type AgentLlmSetup,
  type LLMHealth,
  type LlmModelsList,
  type LlmModelsProbe,
  type LlmProviderInfo,
} from '../../lib/api'
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

export function useLlmModelsQuery(probe: LlmModelsProbe, enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const provider = probe.ai_provider ?? 'openai'
  const baseUrl = probe.ai_base_url ?? ''
  const hasDraftKey = Boolean(probe.ai_api_key?.trim())

  return useQuery({
    queryKey: queryKeys.llmModels(provider, baseUrl, hasDraftKey),
    queryFn: () =>
      api<LlmModelsList>('/ai/models', {
        method: 'POST',
        body: JSON.stringify(probe),
      }),
    enabled: isAuthenticated && enabled && Boolean(provider),
    staleTime: 30_000,
    retry: false,
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

export function useAgentLlmSetupQuery(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.agentLlmSetup,
    queryFn: () => api<AgentLlmSetup>('/ai/agent-setup'),
    enabled: isAuthenticated && enabled,
    staleTime: 15_000,
    retry: false,
  })
}
