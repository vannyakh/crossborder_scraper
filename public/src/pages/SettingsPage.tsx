import {
  Box,
  Button,
  Checkbox,
  Field,
  Grid,
  HStack,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { MarketplaceIntegrationsPanel } from '../components/settings/MarketplaceIntegrationsPanel'
import { RuntimeStatusPanel } from '../components/settings/RuntimeStatusPanel'
import { Toolbar } from '../components/layout/Toolbar'
import { FadeIn } from '../components/motion/FadeIn'
import { fieldStyles } from '../components/ui/field-styles'
import { Panel, PanelBody, PanelHeader } from '../components/ui/Panel'
import { StatusBadge } from '../components/ui/StatusBadge'
import type { MarketplaceEntry } from '../lib/api'
import {
  useCheckLLMHealthMutation,
  useLLMHealthQuery,
  usePanelConfigQuery,
  useUpdatePanelConfigMutation,
} from '../hooks'

function healthTone(ok: boolean | undefined): 'success' | 'danger' | 'neutral' {
  if (ok === true) return 'success'
  if (ok === false) return 'danger'
  return 'neutral'
}

export function SettingsPage() {
  const { data: panel, isLoading } = usePanelConfigQuery()
  const healthQuery = useLLMHealthQuery(Boolean(panel?.ai_enabled))
  const updateMutation = useUpdatePanelConfigMutation()
  const checkMutation = useCheckLLMHealthMutation()

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
  const [proxyServer, setProxyServer] = useState('')
  const [marketplaces, setMarketplaces] = useState<Record<string, MarketplaceEntry>>({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!panel) return
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
    setProxyServer('')
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

  async function handleSave() {
    setMessage('')
    try {
      const payload: Parameters<typeof updateMutation.mutateAsync>[0] = {
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
      await updateMutation.mutateAsync(payload)
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

  const health = checkMutation.data ?? healthQuery.data

  return (
    <VStack align="stretch" gap={0}>
      <Toolbar
        title="Settings"
        description="All service config is stored in config/ui_config.json — editable here or in the web UI."
      />

      <FadeIn>
        <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={4}>
          <VStack align="stretch" gap={4}>
            <Panel>
              <PanelHeader title="AI & engine" description="Stored in panel JSON config" />
              <PanelBody>
                {isLoading ? (
                  <Text fontSize="sm" color="fg.muted">
                    Loading…
                  </Text>
                ) : (
                  <VStack align="stretch" gap={3}>
                    <Checkbox.Root
                      checked={enabled}
                      onCheckedChange={(e) => setEnabled(!!e.checked)}
                      colorPalette="blue"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="sm">Enable AI extraction</Checkbox.Label>
                    </Checkbox.Root>
                    <Checkbox.Root
                      checked={fallback}
                      onCheckedChange={(e) => setFallback(!!e.checked)}
                      colorPalette="blue"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="sm">Auto-fallback when CSS parse incomplete</Checkbox.Label>
                    </Checkbox.Root>
                    <Checkbox.Root
                      checked={agentEnabled}
                      onCheckedChange={(e) => setAgentEnabled(!!e.checked)}
                      colorPalette="blue"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="sm">AI agent validate & enrich</Checkbox.Label>
                    </Checkbox.Root>

                    <Field.Root>
                      <Field.Label fontSize="xs" color="fg.muted">
                        Model
                      </Field.Label>
                      <Input {...fieldStyles} value={model} onChange={(e) => setModel(e.target.value)} />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label fontSize="xs" color="fg.muted">
                        Base URL
                      </Field.Label>
                      <Input
                        {...fieldStyles}
                        value={aiBaseUrl}
                        onChange={(e) => setAiBaseUrl(e.target.value)}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label fontSize="xs" color="fg.muted">
                        API key
                      </Field.Label>
                      <Input
                        {...fieldStyles}
                        type="password"
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        placeholder={
                          panel?.ai_api_key_set
                            ? `Current: ${panel.ai_api_key_masked ?? 'set'}`
                            : 'sk-…'
                        }
                      />
                    </Field.Root>

                    <SimpleGrid columns={2} gap={3}>
                      <Field.Root>
                        <Field.Label fontSize="xs" color="fg.muted">
                          Max concurrent jobs
                        </Field.Label>
                        <Input
                          {...fieldStyles}
                          type="number"
                          value={String(maxJobs)}
                          onChange={(e) => setMaxJobs(Number(e.target.value))}
                        />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label fontSize="xs" color="fg.muted">
                          Default workers
                        </Field.Label>
                        <Input
                          {...fieldStyles}
                          type="number"
                          min={1}
                          max={maxJobs}
                          value={String(workers)}
                          onChange={(e) => setWorkers(Number(e.target.value))}
                        />
                      </Field.Root>
                      <Field.Root gridColumn="1 / -1">
                        <Field.Label fontSize="xs" color="fg.muted">
                          Proxy server (optional)
                        </Field.Label>
                        <Input
                          {...fieldStyles}
                          type="password"
                          value={proxyServer}
                          onChange={(e) => setProxyServer(e.target.value)}
                          placeholder={
                            panel?.proxy_server_set
                              ? `Current: ${panel.proxy_server_masked ?? 'set'}`
                              : 'http://user:pass@host:port'
                          }
                        />
                      </Field.Root>
                    </SimpleGrid>
                  </VStack>
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Scrape & pricing" description="Panel JSON config" />
              <PanelBody>
                {isLoading ? null : (
                  <SimpleGrid columns={2} gap={3}>
                    <Field.Root>
                      <Field.Label fontSize="xs" color="fg.muted">
                        Price markup %
                      </Field.Label>
                      <Input
                        {...fieldStyles}
                        type="number"
                        value={String(markupPercent)}
                        onChange={(e) => setMarkupPercent(Number(e.target.value))}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label fontSize="xs" color="fg.muted">
                        Default currency
                      </Field.Label>
                      <Input
                        {...fieldStyles}
                        value={currency}
                        maxLength={3}
                        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      />
                    </Field.Root>
                  </SimpleGrid>
                )}
              </PanelBody>
            </Panel>
          </VStack>

          <VStack align="stretch" gap={4}>
            <Panel>
              <PanelHeader
                title="Marketplace integrations"
                description="Any platform — built-in exporters plus custom entries in JSON"
              />
              <PanelBody>
                {isLoading ? (
                  <Text fontSize="sm" color="fg.muted">
                    Loading…
                  </Text>
                ) : (
                  <MarketplaceIntegrationsPanel
                    marketplaces={marketplaces}
                    onChange={handleMarketplaceChange}
                    onCredentialChange={handleCredentialChange}
                  />
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="LLM health" description="Live provider status" />
              <PanelBody>
                <VStack align="stretch" gap={3}>
                  <HStack gap={2}>
                    <StatusBadge
                      status={healthTone(health?.ok)}
                      label={health?.status ?? (healthQuery.isLoading ? 'checking' : 'unknown')}
                    />
                    {health?.model ? (
                      <Text fontSize="sm" color="fg.muted">
                        {health.model}
                      </Text>
                    ) : null}
                  </HStack>
                  <Box fontSize="sm" color="fg.muted" lineHeight="short">
                    {health?.message ?? 'Run a health check to verify the configured LLM endpoint.'}
                  </Box>
                  <HStack gap={2} flexWrap="wrap">
                    <Button
                      size="sm"
                      colorPalette="blue"
                      borderRadius="input"
                      loading={updateMutation.isPending}
                      onClick={() => void handleSave()}
                    >
                      Save panel settings
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="border.subtle"
                      borderRadius="input"
                      loading={checkMutation.isPending}
                      onClick={() => void handleHealthCheck()}
                    >
                      Test LLM
                    </Button>
                  </HStack>
                  {message ? (
                    <Text fontSize="sm" color={message.includes('HTTP') ? 'red.500' : 'fg.muted'}>
                      {message}
                    </Text>
                  ) : null}
                  <Text fontSize="xs" color="fg.subtle">
                    Config file: <code>{panel?.ui_config_path ?? 'config/ui_config.json'}</code>. Only{' '}
                    <code>PANEL_*</code> login stays in <code>.env</code>.
                  </Text>
                </VStack>
              </PanelBody>
            </Panel>
          </VStack>
        </Grid>

        <Box mt={4}>
          <RuntimeStatusPanel />
        </Box>
      </FadeIn>
    </VStack>
  )
}
