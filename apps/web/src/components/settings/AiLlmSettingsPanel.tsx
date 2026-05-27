import {
  Box,
  Button,
  Grid,
  HStack,
  Input,
  Menu,
  Portal,
  Select,
  SimpleGrid,
  Text,
  createListCollection,
} from '@chakra-ui/react'
import { Check, ChevronDown, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { formatModelRef } from '../../config/llm-providers'
import { useAccentPalette, useLlmProvidersQuery } from '../../hooks'
import type { LLMHealth, LlmProviderId, LlmProviderInfo } from '../../lib/api'
import { fieldStyles } from '../ui/field-styles'
import { Section, SectionCard } from '../ui/Section'
import { SectionPanelSkeleton } from '../ui/PanelSkeleton'
import { StatusBadge } from '../ui/StatusBadge'
import { SettingsCheckbox, SettingsField } from './SettingsFields'
import type { PanelSettingsForm } from './use-panel-settings-form'

const MODEL_SUGGESTIONS: Partial<Record<LlmProviderId, string[]>> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  anthropic: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
  google: ['gemini-2.0-flash', 'gemini-2.5-flash-preview-05-20'],
  ollama: ['llama3.2', 'llama3.3', 'qwen2.5'],
  qwen: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
}

function healthTone(ok: boolean | undefined): 'success' | 'danger' | 'neutral' {
  if (ok === true) return 'success'
  if (ok === false) return 'danger'
  return 'neutral'
}

function selectTriggerProps() {
  return {
    ...fieldStyles,
    w: 'full',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    px: 3,
    py: 2,
    minH: '2.5rem',
    cursor: 'pointer',
  } as const
}

function ProviderSelect({
  providers,
  value,
  disabled,
  onChange,
}: {
  providers: LlmProviderInfo[]
  value: LlmProviderId
  disabled?: boolean
  onChange: (id: LlmProviderId) => void
}) {
  const collection = useMemo(
    () =>
      createListCollection({
        items: providers.map((p) => ({ label: p.label, value: p.id })),
      }),
    [providers],
  )

  return (
    <Select.Root
      collection={collection}
      value={[value]}
      disabled={disabled || providers.length === 0}
      positioning={{ sameWidth: true }}
      onValueChange={(details) => {
        const next = details.value[0] as LlmProviderId | undefined
        if (next) onChange(next)
      }}
    >
      <Select.HiddenSelect name="ai_provider" />
      <Select.Control>
        <Select.Trigger {...selectTriggerProps()}>
          <Select.ValueText placeholder="Choose provider" fontSize="sm" />
          <Select.IndicatorGroup>
            <Select.Indicator>
              <ChevronDown size={14} strokeWidth={2} aria-hidden />
            </Select.Indicator>
          </Select.IndicatorGroup>
        </Select.Trigger>
      </Select.Control>
      <Portal>
        <Select.Positioner zIndex={50}>
          <Select.Content
            borderRadius="input"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.panel"
            py={1}
            maxH="min(320px, 50vh)"
            overflowY="auto"
            className="app-scroll"
          >
            {collection.items.map((item) => (
              <Select.Item key={item.value} item={item} px={3} py={2}>
                <HStack justify="space-between" w="full" gap={2}>
                  <Select.ItemText fontSize="sm">{item.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={14} strokeWidth={2} aria-hidden />
                  </Select.ItemIndicator>
                </HStack>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  )
}

function ModelPresetMenu({
  provider,
  selectedProvider,
  model,
  disabled,
  onSelect,
}: {
  provider: LlmProviderId
  selectedProvider?: LlmProviderInfo
  model: string
  disabled?: boolean
  onSelect: (model: string) => void
}) {
  const accentPalette = useAccentPalette()
  const suggestions = useMemo(() => {
    const fromMap = MODEL_SUGGESTIONS[provider] ?? []
    const defaults = selectedProvider?.default_model ? [selectedProvider.default_model] : []
    return [...new Set([...defaults, ...fromMap])]
  }, [provider, selectedProvider?.default_model])

  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }} closeOnSelect>
      <Menu.Trigger asChild>
        <Button
          size="sm"
          variant="outline"
          colorPalette={accentPalette}
          borderColor="border.subtle"
          borderRadius="var(--radius-input)"
          disabled={disabled || suggestions.length === 0}
          flexShrink={0}
        >
          <HStack gap={1.5}>
            <Sparkles size={14} strokeWidth={2} aria-hidden />
            <Text fontSize="sm">Presets</Text>
            <ChevronDown size={14} strokeWidth={2} aria-hidden />
          </HStack>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner zIndex={50}>
          <Menu.Content
            minW="14rem"
            maxH="min(280px, 45vh)"
            overflowY="auto"
            className="app-scroll"
            borderRadius="input"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.panel"
            py={1}
          >
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel px={3} py={1.5} fontSize="xs" color="fg.muted">
                Suggested models
              </Menu.ItemGroupLabel>
              {suggestions.map((id) => {
                const active = model === id
                return (
                  <Menu.Item
                    key={id}
                    value={id}
                    onClick={() => onSelect(id)}
                    bg={active ? 'bg.panelHover' : undefined}
                  >
                    <HStack justify="space-between" w="full" gap={2}>
                      <Text fontSize="sm" fontFamily="mono">
                        {id}
                      </Text>
                      {active ? <Check size={14} strokeWidth={2} aria-hidden /> : null}
                    </HStack>
                  </Menu.Item>
                )
              })}
            </Menu.ItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

export function AiLlmSettingsPanel({
  form,
  health,
}: {
  form: PanelSettingsForm
  health?: LLMHealth
}) {
  const { panel, isLoading } = form
  const providersQuery = useLlmProvidersQuery()
  const providers = providersQuery.data?.providers ?? []
  const selectedProvider = providers.find((p) => p.id === form.provider)
  const modelRef = formatModelRef(form.provider, form.model)

  if (isLoading) {
    return <SectionPanelSkeleton title="AI & LLM" description="Model, API key, extraction & agent" mt={0} fields={6} />
  }

  return (
    <Section
      title="AI & LLM"
      description="Provider, model ref, and credentials for extraction and the gateway agent"
      mt={0}
    >
      <SectionCard>
        <HStack
          justify="space-between"
          align="flex-start"
          flexWrap="wrap"
          gap={3}
          pb={4}
          mb={4}
          borderBottomWidth="1px"
          borderColor="border.subtle"
        >
          <Box minW={0}>
            <Text fontSize="xs" color="fg.muted" mb={1}>
              Active model ref
            </Text>
            <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
              {modelRef}
            </Text>
          </Box>
          {health ? (
            <Box textAlign={{ base: 'left', sm: 'right' }}>
              <HStack gap={2} justify={{ base: 'flex-start', sm: 'flex-end' }} mb={1}>
                <Text fontSize="xs" color="fg.muted">
                  LLM status
                </Text>
                <StatusBadge status={healthTone(health.ok)} label={health.status} />
              </HStack>
              <Text fontSize="xs" color="fg.subtle" maxW="20rem">
                {health.model_ref ?? health.provider_label ? `${health.model_ref ?? health.provider_label} · ` : ''}
                {health.message}
              </Text>
            </Box>
          ) : null}
        </HStack>

        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={3}>
              Provider
            </Text>
            <SettingsField
              label="LLM provider"
              hint={
                providersQuery.isError
                  ? 'Could not load providers from server'
                  : 'Auto-fills base URL and default model'
              }
            >
              <ProviderSelect
                providers={providers}
                value={form.provider}
                disabled={providersQuery.isLoading}
                onChange={form.setProvider}
              />
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
                Scrape validate & enrich (post-extraction)
              </SettingsCheckbox>
            </Box>
          </Box>
        </Grid>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={6}>
          <SettingsField label="Model ID" hint={`Ref: ${modelRef}`}>
            <HStack gap={2} align="stretch">
              <Input
                {...fieldStyles}
                flex={1}
                fontFamily="mono"
                fontSize="sm"
                value={form.model}
                onChange={(e) => form.setModel(e.target.value)}
                placeholder={selectedProvider?.default_model || 'model-id'}
              />
              <ModelPresetMenu
                provider={form.provider}
                selectedProvider={selectedProvider}
                model={form.model}
                onSelect={form.setModel}
              />
            </HStack>
          </SettingsField>
          <SettingsField
            label="Base URL"
            hint={
              selectedProvider?.requires_api_key === false
                ? 'Local endpoint — API key usually not required'
                : undefined
            }
          >
            <Input
              {...fieldStyles}
              fontFamily="mono"
              fontSize="sm"
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
              placeholder={
                panel?.ai_api_key_set ? 'Leave blank to keep current' : selectedProvider?.api_key_hint
              }
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
      </SectionCard>
    </Section>
  )
}
