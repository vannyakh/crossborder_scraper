import { useEffect, useState } from 'react'
import type { LlmProviderId, PanelConfigUpdate } from '../../lib/api'
import {
  useCheckLLMHealthMutation,
  useLlmProvidersQuery,
  usePanelConfigQuery,
  useUpdatePanelConfigMutation,
} from '../../hooks'
import { buildProxyLine, emptyParsedProxy, type ParsedProxy, type ProxyScheme } from './proxy-url'

export type VpnMode = 'local_socks' | 'wireguard'

export function usePanelSettingsForm() {
  const { data: panel, isLoading } = usePanelConfigQuery()
  const { data: providersData } = useLlmProvidersQuery()
  const updateMutation = useUpdatePanelConfigMutation()
  const checkMutation = useCheckLLMHealthMutation()

  const [provider, setProvider] = useState<LlmProviderId>('openai')
  const [enabled, setEnabled] = useState(false)
  const [fallback, setFallback] = useState(true)
  const [agentEnabled, setAgentEnabled] = useState(false)
  const [model, setModel] = useState('')
  const [aiBaseUrl, setAiBaseUrl] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [maxHtmlChars, setMaxHtmlChars] = useState(24000)
  const [timeoutSeconds, setTimeoutSeconds] = useState(90)
  const [proxyParts, setProxyParts] = useState<ParsedProxy>(emptyParsedProxy())
  const [proxyListPath, setProxyListPath] = useState('')
  const [proxyRotation, setProxyRotation] = useState<'round_robin' | 'random'>('round_robin')
  const [vpnEnabled, setVpnEnabled] = useState(false)
  const [vpnMode, setVpnMode] = useState<VpnMode>('local_socks')
  const [vpnLocalEndpoint, setVpnLocalEndpoint] = useState('')
  const [vpnConfigPath, setVpnConfigPath] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!panel) return
    setProvider((panel.ai_provider as LlmProviderId) || 'openai')
    setEnabled(panel.ai_enabled)
    setFallback(panel.ai_fallback)
    setAgentEnabled(panel.ai_agent_enabled)
    setModel(panel.ai_model)
    setAiBaseUrl(panel.ai_base_url)
    setAiApiKey('')
    setMaxHtmlChars(panel.ai_max_html_chars)
    setTimeoutSeconds(panel.ai_timeout_seconds)
    setProxyParts(emptyParsedProxy())
    setProxyListPath(panel.proxy_list_path ?? '')
    setProxyRotation(panel.proxy_rotation_strategy === 'random' ? 'random' : 'round_robin')
    setVpnEnabled(panel.vpn_enabled ?? false)
    setVpnMode(panel.vpn_mode === 'wireguard' ? 'wireguard' : 'local_socks')
    setVpnLocalEndpoint('')
    setVpnConfigPath(panel.vpn_config_path ?? '')
  }, [panel])

  function patchProxyParts(patch: Partial<ParsedProxy>) {
    setProxyParts((prev) => ({ ...prev, ...patch }))
  }

  function handleProviderChange(next: LlmProviderId) {
    setProvider(next)
    const preset = providersData?.providers?.find((p) => p.id === next)
    if (preset?.base_url) setAiBaseUrl(preset.base_url)
    if (preset?.default_model) setModel(preset.default_model)
  }

  function buildPayload(): PanelConfigUpdate {
    const payload: PanelConfigUpdate = {
      ai_provider: provider,
      ai_enabled: enabled,
      ai_fallback: fallback,
      ai_agent_enabled: agentEnabled,
      ai_model: model,
      ai_base_url: aiBaseUrl,
      ai_max_html_chars: maxHtmlChars,
      ai_timeout_seconds: timeoutSeconds,
      proxy_list_path: proxyListPath.trim() || null,
      proxy_rotation_strategy: proxyRotation,
      vpn_enabled: vpnEnabled,
      vpn_mode: vpnMode,
      vpn_config_path: vpnConfigPath.trim() || null,
    }
    const proxyLine = buildProxyLine(proxyParts)
    if (proxyLine) payload.proxy_server = proxyLine
    if (vpnLocalEndpoint.trim()) payload.vpn_local_endpoint = vpnLocalEndpoint.trim()
    if (aiApiKey.trim()) payload.ai_api_key = aiApiKey.trim()
    return payload
  }

  async function handleSave() {
    setMessage('')
    try {
      await updateMutation.mutateAsync(buildPayload())
      setAiApiKey('')
      setProxyParts(emptyParsedProxy())
      setVpnLocalEndpoint('')
      setMessage(`Saved to ${panel?.ui_config_path ?? 'config/ui_config.json'}`)
    } catch (err) {
      setMessage(String((err as Error).message || err))
    }
  }

  async function handleHealthCheck() {
    setMessage('')
    try {
      const result = await checkMutation.mutateAsync()
      setMessage(result.message)
    } catch (err) {
      setMessage(String((err as Error).message || err))
    }
  }

  return {
    panel,
    isLoading,
    updateMutation,
    checkMutation,
    message,
    provider,
    setProvider: handleProviderChange,
    enabled,
    setEnabled,
    fallback,
    setFallback,
    agentEnabled,
    setAgentEnabled,
    model,
    setModel,
    aiBaseUrl,
    setAiBaseUrl,
    aiApiKey,
    setAiApiKey,
    maxHtmlChars,
    setMaxHtmlChars,
    timeoutSeconds,
    setTimeoutSeconds,
    proxyParts,
    patchProxyParts,
    setProxyScheme: (scheme: ProxyScheme) => patchProxyParts({ scheme }),
    proxyListPath,
    setProxyListPath,
    proxyRotation,
    setProxyRotation,
    vpnEnabled,
    setVpnEnabled,
    vpnMode,
    setVpnMode,
    vpnLocalEndpoint,
    setVpnLocalEndpoint,
    vpnConfigPath,
    setVpnConfigPath,
    handleSave,
    handleHealthCheck,
  }
}

export type PanelSettingsForm = ReturnType<typeof usePanelSettingsForm>
