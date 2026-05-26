import {
  Box,
  Checkbox,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Text,
} from '@chakra-ui/react'
import { fieldStyles } from '../ui/field-styles'
import { Section, SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { MarketplaceIntegrationsPanel } from './MarketplaceIntegrationsPanel'
import { RuntimeStatusPanel } from './RuntimeStatusPanel'
import type { PanelSettingsForm } from './use-panel-settings-form'
import type { LLMHealth } from '../../lib/api'

function SettingsCheckbox({
  checked,
  onCheckedChange,
  children,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  const accentPalette = useAccentPalette()
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={(e) => onCheckedChange(!!e.checked)}
      colorPalette={accentPalette}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label fontSize="sm">{children}</Checkbox.Label>
    </Checkbox.Root>
  )
}

function SettingsField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <Field.Root>
      <Field.Label fontSize="xs" color="fg.muted">
        {label}
      </Field.Label>
      {children}
      {hint ? (
        <Field.HelperText fontSize="xs" color="fg.subtle">
          {hint}
        </Field.HelperText>
      ) : null}
    </Field.Root>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="space-between" py={1.5} fontSize="sm" borderBottomWidth="1px" borderColor="border.subtle">
      <Text color="fg.muted">{label}</Text>
      <Text fontWeight="medium" fontFamily="mono" fontSize="xs">
        {value}
      </Text>
    </HStack>
  )
}

function healthTone(ok: boolean | undefined): 'success' | 'danger' | 'neutral' {
  if (ok === true) return 'success'
  if (ok === false) return 'danger'
  return 'neutral'
}

export function PanelInfoSection({ form }: { form: PanelSettingsForm }) {
  const { panel, isLoading } = form
  return (
    <Section title="Panel" description="Configuration storage and paths" mt={0}>
      <SectionCard>
        {isLoading || !panel ? (
          <Text fontSize="sm" color="fg.muted">
            Loading…
          </Text>
        ) : (
          <Box>
            <InfoRow label="Config file" value={panel.ui_config_path} />
            <InfoRow label="Config directory" value={panel.config_dir} />
            <InfoRow
              label="Secrets source"
              value={panel.secrets_from_panel_config ? 'Panel JSON' : 'Environment'}
            />
            <Text mt={4} fontSize="xs" color="fg.muted" lineHeight="short">
              Panel login credentials (<code>PANEL_*</code>) stay in <code>.env</code>. All scrape,
              AI, proxy, and marketplace settings are stored in{' '}
              <code>{panel.ui_config_path}</code>.
            </Text>
          </Box>
        )}
      </SectionCard>
    </Section>
  )
}

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

  return (
    <Section title="AI & LLM" description="OpenAI-compatible extraction and gateway agent" mt={0}>
      <SectionCard>
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
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

          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={3}>
              Provider
            </Text>
            <SimpleGrid columns={1} gap={3}>
              <SettingsField label="Model">
                <Input {...fieldStyles} value={form.model} onChange={(e) => form.setModel(e.target.value)} />
              </SettingsField>
              <SettingsField label="Base URL">
                <Input
                  {...fieldStyles}
                  value={form.aiBaseUrl}
                  onChange={(e) => form.setAiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </SettingsField>
              <SettingsField label="API key" hint={panel?.ai_api_key_set ? `Current: ${panel.ai_api_key_masked ?? 'set'}` : undefined}>
                <Input
                  {...fieldStyles}
                  type="password"
                  value={form.aiApiKey}
                  onChange={(e) => form.setAiApiKey(e.target.value)}
                  placeholder={panel?.ai_api_key_set ? 'Leave blank to keep current' : 'sk-…'}
                />
              </SettingsField>
            </SimpleGrid>
          </Box>
        </Grid>

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
              {health.message}
            </Text>
          </Box>
        ) : null}
      </SectionCard>
    </Section>
  )
}

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

export function ServiceSettingsSection({
  form,
  health,
}: {
  form: PanelSettingsForm
  health?: LLMHealth
}) {
  return (
    <Box>
      <RuntimeStatusPanel />
      {health ? (
        <Section title="LLM health" description="Last provider probe result" mt={5}>
          <SectionCard>
            <HStack gap={2} mb={2}>
              <StatusBadge status={healthTone(health.ok)} label={health.status} />
              {health.model ? (
                <Text fontSize="sm" color="fg.muted">
                  {health.model}
                </Text>
              ) : null}
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              {health.message}
            </Text>
            {health.base_url ? (
              <Text mt={2} fontSize="xs" color="fg.subtle" fontFamily="mono">
                {health.base_url}
              </Text>
            ) : null}
          </SectionCard>
        </Section>
      ) : null}
      {form.message && form.message.includes('LLM') ? (
        <Text mt={3} fontSize="sm" color="fg.muted">
          {form.message}
        </Text>
      ) : null}
    </Box>
  )
}
