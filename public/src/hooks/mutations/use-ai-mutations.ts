import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, type AIConfig, type AIConfigUpdate } from '../../lib/api'

export function useUpdateAIConfigMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AIConfigUpdate) =>
      api<AIConfig>('/ai/config', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.aiConfig, data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.config })
      void queryClient.invalidateQueries({ queryKey: queryKeys.llmHealth })
    },
  })
}

export function useCheckLLMHealthMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<import('../../lib/api').LLMHealth>('/ai/health'),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.llmHealth, data)
    },
  })
}
