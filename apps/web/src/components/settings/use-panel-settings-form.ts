import { useEffect, useState } from 'react'
import type { LlmProviderId, MarketplaceEntry, PanelConfigUpdate } from '../../lib/api'
import { getLlmProvider } from '../../config/llm-providers'
import {
  useCheckLLMHealthMutation,
  usePanelConfigQuery,
  useUpdatePanelConfigMutation,
} from '../../hooks'

export function usePanelSettingsForm() {
  const { data: panel, isLoading } = usePanelConfigQuery()
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
  const [markupPercent, setMarkupPercent] = useState(35)
  const [currency, setCurrency] = useState('USD')
  const [workers, setWorkers] = useState(3)
  const [maxJobs, setMaxJobs] = useState(3)
  const [headless, setHeadless] = useState(true)
  const [browserTimeoutMs, setBrowserTimeoutMs] = useState(30000)
  const [requestDelaySeconds, setRequestDelaySeconds] = useState(1)
  const [proxyServer, setProxyServer] = useState('')
  const [proxyListPath, setProxyListPath] = useState('')
  const [proxyRotation, setProxyRotation] = useState<'round_robin' | 'random'>('round_robin')
  const [marketplaces, setMarketplaces] = useState<Record<string, MarketplaceEntry>>({})
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
    setMarkupPercent(panel.price_markup_percent)
    setCurrency(panel.default_currency)
    setWorkers(panel.scrape_default_workers)
    setMaxJobs(panel.max_concurrent_jobs)
    setHeadless(panel.headless)
    setBrowserTimeoutMs(panel.browser_timeout_ms)
    setRequestDelaySeconds(panel.request_delay_seconds)
    setProxyServer('')
    setProxyListPath(panel.proxy_list_path ?? '')
    setProxyRotation(
      panel.proxy_rotation_strategy === 'random' ? 'random' : 'round_robin',
    )
    setMarketplaces(panel.marketplaces ?? {})
  }, [panel])

  function handleMarketplaceChange(platformId: string, patch: Partial<MarketplaceEntry>) {
    setMarketplaces((prev) => ({
      ...prev,
      [platformId]: { ...prev[platformId], ...patch },
    }))
  }

  function handleCredentialChange(platformId: string, key: string, value: string) {
    setMarketplaces((prev) => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        credentials: { ...prev[platformId].credentials, [key]: value },
      },
    }))
  }

  function handleProviderChange(next: LlmProviderId) {
    setProvider(next)
    const preset = getLlmProvider(next)
    if (preset.base_url) setAiBaseUrl(preset.base_url)
    if (preset.default_model) setModel(preset.default_model)
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
      price_markup_percent: markupPercent,
      default_currency: currency.toUpperCase(),
      scrape_default_workers: workers,
      max_concurrent_jobs: maxJobs,
      headless,
      browser_timeout_ms: browserTimeoutMs,
      request_delay_seconds: requestDelaySeconds,
      proxy_list_path: proxyListPath.trim() || null,
      proxy_rotation_strategy: proxyRotation,
      marketplaces: Object.fromEntries(
        Object.entries(marketplaces).map(([id, entry]) => [
          id,
          {
            enabled: entry.enabled,
            label: entry.label,
            credentials: entry.credentials,
          },
        ]),
      ),
    }
    if (aiApiKey.trim()) payload.ai_api_key = aiApiKey.trim()
    if (proxyServer.trim()) payload.proxy_server = proxyServer.trim()
    return payload
  }

  async function handleSave() {
    setMessage('')
    try {
      await updateMutation.mutateAsync(buildPayload())
      setAiApiKey('')
      setProxyServer('')
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
    markupPercent,
    setMarkupPercent,
    currency,
    setCurrency,
    workers,
    setWorkers,
    maxJobs,
    setMaxJobs,
    headless,
    setHeadless,
    browserTimeoutMs,
    setBrowserTimeoutMs,
    requestDelaySeconds,
    setRequestDelaySeconds,
    proxyServer,
    setProxyServer,
    proxyListPath,
    setProxyListPath,
    proxyRotation,
    setProxyRotation,
    marketplaces,
    handleMarketplaceChange,
    handleCredentialChange,
    handleSave,
    handleHealthCheck,
  }
}

export type PanelSettingsForm = ReturnType<typeof usePanelSettingsForm>
