import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, type LLMHealth, type LlmModelsProbe } from '../../lib/api'

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
