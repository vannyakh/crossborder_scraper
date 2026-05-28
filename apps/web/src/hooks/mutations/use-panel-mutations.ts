import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, type PanelConfig, type PanelConfigUpdate } from '../../lib/api'

export function useUpdatePanelConfigMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PanelConfigUpdate) =>
      api<PanelConfig>('/config/panel', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.panelConfig, data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.config })
      void queryClient.invalidateQueries({ queryKey: queryKeys.llmHealth })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentLlmSetup })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayStatus })
      void queryClient.invalidateQueries({ queryKey: queryKeys.runtimeStatus })
    },
  })
}
