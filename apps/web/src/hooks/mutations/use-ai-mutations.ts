import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, type LLMHealth } from '../../lib/api'

export function useCheckLLMHealthMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<LLMHealth>('/ai/health'),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.llmHealth, data)
    },
  })
}
