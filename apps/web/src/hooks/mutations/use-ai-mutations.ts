import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, type LLMHealth, type LlmModelsProbe, type OllamaPullRequest, type OllamaPullResponse } from '../../lib/api'

export function useCheckLLMHealthMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (probe?: LlmModelsProbe) =>
      probe
        ? api<LLMHealth>('/ai/health', {
            method: 'POST',
            body: JSON.stringify(probe),
          })
        : api<LLMHealth>('/ai/health'),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.llmHealth, data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentLlmSetup })
    },
  })
}

export function useOllamaPullMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: OllamaPullRequest) =>
      api<OllamaPullResponse>('/ai/ollama/pull', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    onSuccess: () => {
      // Model pull runs in background — refresh after a short delay
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['ai', 'models', 'ollama'] })
        void queryClient.invalidateQueries({ queryKey: queryKeys.agentLlmSetup })
      }, 3000)
    },
  })
}
