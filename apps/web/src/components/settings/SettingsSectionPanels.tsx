import {
  Box,
  Input,
  NativeSelect,
  SimpleGrid,
  Text,
} from '@chakra-ui/react'
import { fieldStyles } from '../ui/field-styles'
import { Section, SectionCard } from '../ui/Section'
import { MarketplaceIntegrationsPanel } from './MarketplaceIntegrationsPanel'
import type { PanelSettingsForm } from './use-panel-settings-form'
import { SettingsCheckbox, SettingsField } from './SettingsFields'

export { PanelAppearanceSection } from './PanelAppearanceSection'
<<<<<<< HEAD
export { NetworkAccessSection } from './NetworkAccessSection'
export { AiLlmSettingsPanel as AiSettingsSection } from './AiLlmSettingsPanel'
=======
export { PanelSecuritySection, PanelSecuritySection as NetworkAccessSection } from './PanelSecuritySection'

export function AiSettingsSection({
  form,
  health,
}: {
  form: PanelSettingsForm
  health?: LLMHealth
}) {
  const { panel, isLoading } = form
  if (isLoading) {
    return (
      <Section title="AI & LLM" mt={0}>
        <Text fontSize="sm" color="fg.muted">
          Loading…
        </Text>
      </Section>
    )
  }

  const selectedProvider = LLM_PROVIDER_PRESETS.find((p) => p.id === form.provider)

  return (
    <Section
      title="AI & LLM"
      description="Multi-provider extraction and gateway agent (OpenAI, Claude, Gemini, Ollama, Qwen)"
      mt={0}
    >
      <SectionCard>
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={3}>
              Provider
            </Text>
            <SettingsField label="LLM provider" hint="Auto-fills base URL and default model">
              <NativeSelect.Root>
                <NativeSelect.Field
                  {...fieldStyles}
                  value={form.provider}
                  onChange={(e) => form.setProvider(e.target.value as LlmProviderId)}
                >
                  {LLM_PROVIDER_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </SettingsField>
            {selectedProvider?.docs_url ? (
              <Text fontSize="xs" color="fg.subtle" mt={2}>
                API keys: {selectedProvider.docs_url}
              </Text>
            ) : null}
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={3}>
              Features
            </Text>
            <Box display="flex" flexDirection="column" gap={3}>
              <SettingsCheckbox checked={form.enabled} onCheckedChange={form.setEnabled}>
                Enable AI extraction
              </SettingsCheckbox>
              <SettingsCheckbox checked={form.fallback} onCheckedChange={form.setFallback}>
                Auto-fallback when CSS parse incomplete
              </SettingsCheckbox>
              <SettingsCheckbox checked={form.agentEnabled} onCheckedChange={form.setAgentEnabled}>
                AI agent validate & enrich
              </SettingsCheckbox>
            </Box>
          </Box>
        </Grid>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={6}>
          <SettingsField label="Model" hint={selectedProvider ? `Default: ${selectedProvider.default_model}` : undefined}>
            <Input {...fieldStyles} value={form.model} onChange={(e) => form.setModel(e.target.value)} />
          </SettingsField>
          <SettingsField
            label="Base URL"
            hint={selectedProvider?.requires_api_key === false ? 'Local Ollama — no API key needed' : undefined}
          >
            <Input
              {...fieldStyles}
              value={form.aiBaseUrl}
              onChange={(e) => form.setAiBaseUrl(e.target.value)}
              placeholder={selectedProvider?.base_url || 'https://api.openai.com/v1'}
            />
          </SettingsField>
          <SettingsField
            label="API key"
            hint={
              panel?.ai_api_key_set
                ? `Current: ${panel.ai_api_key_masked ?? 'set'} · ${selectedProvider?.api_key_hint ?? ''}`
                : selectedProvider?.api_key_hint
            }
          >
            <Input
              {...fieldStyles}
              type="password"
              value={form.aiApiKey}
              onChange={(e) => form.setAiApiKey(e.target.value)}
              placeholder={panel?.ai_api_key_set ? 'Leave blank to keep current' : selectedProvider?.api_key_hint}
            />
          </SettingsField>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={6}>
          <SettingsField label="Max HTML chars" hint="Truncate page HTML before LLM prompt">
            <Input
              {...fieldStyles}
              type="number"
              value={String(form.maxHtmlChars)}
              onChange={(e) => form.setMaxHtmlChars(Number(e.target.value))}
            />
          </SettingsField>
          <SettingsField label="Timeout (seconds)" hint="LLM request timeout">
            <Input
              {...fieldStyles}
              type="number"
              value={String(form.timeoutSeconds)}
              onChange={(e) => form.setTimeoutSeconds(Number(e.target.value))}
            />
          </SettingsField>
        </SimpleGrid>

        {health ? (
          <Box mt={6} pt={4} borderTopWidth="1px" borderColor="border.subtle">
            <HStack gap={2} mb={2}>
              <Text fontSize="sm" fontWeight="semibold">
                LLM status
              </Text>
              <StatusBadge status={healthTone(health.ok)} label={health.status} />
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              {health.provider_label ? `${health.provider_label} · ` : ''}
              {health.message}
            </Text>
          </Box>
        ) : null}
      </SectionCard>
    </Section>
  )
}
>>>>>>> 740efd717033758a87c3256919c68e8b6513ecf5

export function ScrapeSettingsSection({ form }: { form: PanelSettingsForm }) {
  if (form.isLoading) {
    return (
      <Section title="Scrape engine" mt={0}>
        <Text fontSize="sm" color="fg.muted">
          Loading…
        </Text>
      </Section>
    )
  }

  return (
    <Section title="Scrape engine" description="Concurrency, browser, and request pacing" mt={0}>
      <SectionCard>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <SettingsField label="Max concurrent jobs" hint="Global batch worker limit">
            <Input
              {...fieldStyles}
              type="number"
              min={1}
              value={String(form.maxJobs)}
              onChange={(e) => form.setMaxJobs(Number(e.target.value))}
            />
          </SettingsField>
          <SettingsField label="Default workers" hint="Per-batch default (capped by max jobs)">
            <Input
              {...fieldStyles}
              type="number"
              min={1}
              max={form.maxJobs}
              value={String(form.workers)}
              onChange={(e) => form.setWorkers(Number(e.target.value))}
            />
          </SettingsField>
          <SettingsField label="Browser timeout (ms)">
            <Input
              {...fieldStyles}
              type="number"
              value={String(form.browserTimeoutMs)}
              onChange={(e) => form.setBrowserTimeoutMs(Number(e.target.value))}
            />
          </SettingsField>
          <SettingsField label="Request delay (seconds)" hint="Pause between scrape requests">
            <Input
              {...fieldStyles}
              type="number"
              step="0.1"
              value={String(form.requestDelaySeconds)}
              onChange={(e) => form.setRequestDelaySeconds(Number(e.target.value))}
            />
          </SettingsField>
        </SimpleGrid>

        <Box mt={4}>
          <SettingsCheckbox checked={form.headless} onCheckedChange={form.setHeadless}>
            Headless browser (recommended on servers)
          </SettingsCheckbox>
        </Box>
      </SectionCard>
    </Section>
  )
}

export function ProxySettingsSection({ form }: { form: PanelSettingsForm }) {
  const { panel } = form
  if (form.isLoading) {
    return (
      <Section title="Proxy" mt={0}>
        <Text fontSize="sm" color="fg.muted">
          Loading…
        </Text>
      </Section>
    )
  }

  return (
    <Section title="Proxy" description="Single proxy URL or rotating proxy list file" mt={0}>
      <SectionCard>
        <SimpleGrid columns={1} gap={4}>
          <SettingsField
            label="Proxy server"
            hint={panel?.proxy_server_set ? `Current: ${panel.proxy_server_masked ?? 'set'}` : 'http://user:pass@host:port'}
          >
            <Input
              {...fieldStyles}
              type="password"
              value={form.proxyServer}
              onChange={(e) => form.setProxyServer(e.target.value)}
              placeholder={panel?.proxy_server_set ? 'Leave blank to keep current' : 'Optional single proxy'}
            />
          </SettingsField>
          <SettingsField label="Proxy list file" hint="One proxy per line — overrides rotation pool">
            <Input
              {...fieldStyles}
              value={form.proxyListPath}
              onChange={(e) => form.setProxyListPath(e.target.value)}
              placeholder="config/proxies.txt"
            />
          </SettingsField>
          <SettingsField label="Rotation strategy">
            <NativeSelect.Root>
              <NativeSelect.Field
                {...fieldStyles}
                value={form.proxyRotation}
                onChange={(e) =>
                  form.setProxyRotation(e.target.value === 'random' ? 'random' : 'round_robin')
                }
              >
                <option value="round_robin">Round robin</option>
                <option value="random">Random</option>
              </NativeSelect.Field>
            </NativeSelect.Root>
          </SettingsField>
        </SimpleGrid>
      </SectionCard>
    </Section>
  )
}

export function PricingSettingsSection({ form }: { form: PanelSettingsForm }) {
  if (form.isLoading) {
    return (
      <Section title="Pricing" mt={0}>
        <Text fontSize="sm" color="fg.muted">
          Loading…
        </Text>
      </Section>
    )
  }

  return (
    <Section title="Pricing" description="Export listing price markup rules" mt={0}>
      <SectionCard>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <SettingsField label="Price markup %" hint="Applied when normalizing for export">
            <Input
              {...fieldStyles}
              type="number"
              value={String(form.markupPercent)}
              onChange={(e) => form.setMarkupPercent(Number(e.target.value))}
            />
          </SettingsField>
          <SettingsField label="Default currency">
            <Input
              {...fieldStyles}
              value={form.currency}
              maxLength={3}
              onChange={(e) => form.setCurrency(e.target.value.toUpperCase())}
            />
          </SettingsField>
        </SimpleGrid>
      </SectionCard>
    </Section>
  )
}

export function MarketplacesSettingsSection({ form }: { form: PanelSettingsForm }) {
  if (form.isLoading) {
    return (
      <Section title="Marketplaces" mt={0}>
        <Text fontSize="sm" color="fg.muted">
          Loading…
        </Text>
      </Section>
    )
  }

  return (
    <Section
      title="Marketplaces"
      description="Built-in exporters and custom platform credentials"
      mt={0}
    >
      <SectionCard p={{ base: 3, md: 4 }}>
        <MarketplaceIntegrationsPanel
          marketplaces={form.marketplaces}
          onChange={form.handleMarketplaceChange}
          onCredentialChange={form.handleCredentialChange}
        />
      </SectionCard>
    </Section>
  )
}
