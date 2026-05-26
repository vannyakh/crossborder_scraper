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
      queryClient.setQueryData(queryKeys.aiConfig, {
        ai_enabled: data.ai_enabled,
        ai_fallback: data.ai_fallback,
        ai_agent_enabled: data.ai_agent_enabled,
        ai_model: data.ai_model,
        ai_base_url: data.ai_base_url,
        ai_max_html_chars: data.ai_max_html_chars,
        ai_timeout_seconds: data.ai_timeout_seconds,
        ai_api_key_set: data.ai_api_key_set,
        ai_api_key_masked: data.ai_api_key_masked,
        ui_config_path: data.ui_config_path,
        secrets_from_env: data.secrets_from_env,
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.config })
      void queryClient.invalidateQueries({ queryKey: queryKeys.llmHealth })
    },
  })
}
