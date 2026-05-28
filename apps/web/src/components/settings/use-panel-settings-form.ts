import { useEffect, useState } from 'react'
import type { LlmProviderId, PanelConfigUpdate } from '../../lib/api'
import {
  useCheckLLMHealthMutation,
  useLlmProvidersQuery,
  usePanelConfigQuery,
  useUpdatePanelConfigMutation,
} from '../../hooks'
import { notifyError, notifySuccess } from '../../lib/toast'
import { buildProxyLine, emptyParsedProxy, type ParsedProxy, type ProxyScheme } from './proxy-url'

export type VpnMode = 'local_socks' | 'wireguard'

export function usePanelSettingsForm() {
  const { data: panel, isLoading } = usePanelConfigQuery()
  const { data: providersData } = useLlmProvidersQuery()
  const updateMutation = useUpdatePanelConfigMutation()
  const checkMutation = useCheckLLMHealthMutation()

  const [provider, setProvider] = useState<LlmProviderId>('openai')
  const [agentEnabled, setAgentEnabled] = useState(false)
  const [model, setModel] = useState('')
  const [aiBaseUrl, setAiBaseUrl] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [timeoutSeconds, setTimeoutSeconds] = useState(90)
  // Scrape engine fields — kept in sync from panel; not edited on agent LLM page
  const [scrapeFallback, setScrapeFallback] = useState(true)
  const [scrapeMaxHtmlChars, setScrapeMaxHtmlChars] = useState(24000)
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
    setAgentEnabled(panel.ai_enabled)
    setModel(panel.ai_model)
    setAiBaseUrl(panel.ai_base_url)
    setAiApiKey('')
    setTimeoutSeconds(panel.ai_timeout_seconds)
    setScrapeFallback(panel.ai_fallback)
    setScrapeMaxHtmlChars(panel.ai_max_html_chars)
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

  function buildAgentLlmPayload(): PanelConfigUpdate {
    const payload: PanelConfigUpdate = {
      ai_provider: provider,
      ai_enabled: agentEnabled,
      ai_model: model,
      ai_base_url: aiBaseUrl,
      ai_timeout_seconds: timeoutSeconds,
    }
    if (aiApiKey.trim()) payload.ai_api_key = aiApiKey.trim()
    return payload
  }

  function buildPayload(): PanelConfigUpdate {
    const payload: PanelConfigUpdate = {
      ai_provider: provider,
      ai_enabled: agentEnabled,
      ai_fallback: scrapeFallback,
      ai_model: model,
      ai_base_url: aiBaseUrl,
      ai_max_html_chars: scrapeMaxHtmlChars,
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

  async function handleSaveAgentLlm() {
    setMessage('')
    try {
      await updateMutation.mutateAsync(buildAgentLlmPayload())
      setAiApiKey('')
      const msg = `Agent LLM saved to ${panel?.ui_config_path ?? 'config/ui_config.json'}`
      setMessage(msg)
      notifySuccess(msg)
    } catch (err) {
      const msg = String((err as Error).message || err)
      setMessage(msg)
      notifyError(msg)
    }
  }

  async function handleSave() {
    setMessage('')
    try {
      await updateMutation.mutateAsync(buildPayload())
      setAiApiKey('')
      setProxyParts(emptyParsedProxy())
      setVpnLocalEndpoint('')
      const msg = `Saved to ${panel?.ui_config_path ?? 'config/ui_config.json'}`
      setMessage(msg)
      notifySuccess(msg)
    } catch (err) {
      const msg = String((err as Error).message || err)
      setMessage(msg)
      notifyError(msg)
    }
  }

  async function handleHealthCheck() {
    setMessage('')
    try {
      const probe = {
        ai_provider: provider,
        ai_base_url: aiBaseUrl,
        ai_model: model,
        ...(aiApiKey.trim() ? { ai_api_key: aiApiKey.trim() } : {}),
      }
      const result = await checkMutation.mutateAsync(probe)
      setMessage(result.message)
      if (result.ok) notifySuccess(result.message)
      else notifyError(result.message)
    } catch (err) {
      const msg = String((err as Error).message || err)
      setMessage(msg)
      notifyError(msg)
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
    agentEnabled,
    setAgentEnabled,
    model,
    setModel,
    aiBaseUrl,
    setAiBaseUrl,
    aiApiKey,
    setAiApiKey,
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
    handleSaveAgentLlm,
    handleHealthCheck,
  }
}

export type PanelSettingsForm = ReturnType<typeof usePanelSettingsForm>
