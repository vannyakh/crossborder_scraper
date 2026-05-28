import {
  Box,
  HStack,
  Input,
  Portal,
  Select,
  SimpleGrid,
  Text,
  createListCollection,
} from '@chakra-ui/react'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { formatModelRef } from '../../config/llm-providers'
import { useLlmModelsQuery, useLlmProvidersQuery } from '../../hooks'
import type { LLMHealth, LlmProviderId, LlmProviderInfo } from '../../lib/api'
import { SectionPanelSkeleton } from '../ui/PanelSkeleton'
import { Section, SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { fieldStyles } from '../ui/field-styles'
import { AgentLlmSetupPanel } from './AgentLlmSetupPanel'
import { SettingsCheckbox, SettingsField } from './SettingsFields'
import type { PanelSettingsForm } from './use-panel-settings-form'

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

function ModelSelect({
  models,
  value,
  loading,
  disabled,
  placeholder,
  onChange,
}: {
  models: { id: string; label?: string | null }[]
  value: string
  loading?: boolean
  disabled?: boolean
  placeholder?: string
  onChange: (id: string) => void
}) {
  const collection = useMemo(
    () =>
      createListCollection({
        items: models.map((m) => ({ label: m.label || m.id, value: m.id })),
      }),
    [models],
  )

  const selectValue = value && models.some((m) => m.id === value) ? [value] : []

  return (
    <Select.Root
      collection={collection}
      value={selectValue}
      disabled={disabled || loading || models.length === 0}
      positioning={{ sameWidth: true }}
      onValueChange={(details) => {
        const next = details.value[0]
        if (next) onChange(next)
      }}
    >
      <Select.HiddenSelect name="ai_model" />
      <Select.Control flex={1}>
        <Select.Trigger {...selectTriggerProps()}>
          <Select.ValueText
            placeholder={placeholder ?? 'Select model'}
            fontSize="sm"
            fontFamily="mono"
          />
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
            maxH="min(360px, 55vh)"
            overflowY="auto"
            className="app-scroll"
          >
            {collection.items.map((item) => (
              <Select.Item key={item.value} item={item} px={3} py={2}>
                <HStack justify="space-between" w="full" gap={2}>
                  <Select.ItemText fontSize="sm" fontFamily="mono">
                    {item.label}
                  </Select.ItemText>
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

  const modelsProbe = useMemo(
    () => ({
      ai_provider: form.provider,
      ai_base_url: form.aiBaseUrl,
      ...(form.aiApiKey.trim() ? { ai_api_key: form.aiApiKey.trim() } : {}),
    }),
    [form.provider, form.aiBaseUrl, form.aiApiKey],
  )

  const modelsQuery = useLlmModelsQuery(modelsProbe)
  const models = modelsQuery.data?.models ?? []
  const { setModel } = form

  useEffect(() => {
    if (!models.length || modelsQuery.isLoading) return
    if (!form.model || !models.some((m) => m.id === form.model)) {
      const preferred =
        models.find((m) => m.id === selectedProvider?.default_model)?.id ?? models[0]?.id
      if (preferred) setModel(preferred)
    }
  }, [models, modelsQuery.isLoading, form.model, setModel, selectedProvider?.default_model])

  if (isLoading) {
    return (
      <SectionPanelSkeleton
        title="Gateway agent LLM"
        description="Provider, model, and API credentials for the panel agent"
        mt={0}
        fields={5}
      />
    )
  }

  const modelsHint = modelsQuery.isError
    ? 'Could not load models from provider'
    : modelsQuery.data?.message ||
      (modelsQuery.data?.source === 'api'
        ? 'Models loaded from provider API'
        : 'Add API key or use local Ollama to list models')

  return (
    <Section title="Gateway agent LLM" mt={0}>
      <AgentLlmSetupPanel
        health={health}
        testing={form.checkMutation.isPending}
        onTestConnection={() => void form.handleHealthCheck()}
      />

      <SectionCard>
        <Text fontSize="sm" fontWeight="semibold" mb={1}>
          LLM connection
        </Text>
        <Text fontSize="xs" color="fg.muted" mb={4}>
          Provider, model, and credentials saved to panel config. Used by chat, cron, and integrate
          channels.
        </Text>
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
              Agent model ref
            </Text>
            <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
              {modelRef}
            </Text>
            <Text fontSize="xs" color="fg.subtle" mt={1}>
              Used by Agent chat, cron schedules, and Telegram. Provider presets come from the
              gateway configuration on the server.
            </Text>
          </Box>
          {health ? (
            <Box textAlign={{ base: 'left', sm: 'right' }}>
              <HStack gap={2} justify={{ base: 'flex-start', sm: 'flex-end' }} mb={1}>
                <Text fontSize="xs" color="fg.muted">
                  Connection
                </Text>
                <StatusBadge status={healthTone(health.ok)} label={health.status} />
              </HStack>
              <Text fontSize="xs" color="fg.subtle" maxW="20rem">
                {health.message}
              </Text>
            </Box>
          ) : null}
        </HStack>

        <SettingsCheckbox checked={form.agentEnabled} onCheckedChange={form.setAgentEnabled}>
          Enable gateway agent LLM
        </SettingsCheckbox>
        <Text fontSize="xs" color="fg.subtle" mt={2} mb={5}>
          Turn on after connection test passes. Skills and cron jobs reuse this model automatically.
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          <SettingsField
            label="LLM provider"
            hint={
              providersQuery.isError
                ? 'Could not load provider list from server'
                : 'Gateway agent provider presets'
            }
          >
            <ProviderSelect
              providers={providers}
              value={form.provider}
              disabled={providersQuery.isLoading}
              onChange={form.setProvider}
            />
          </SettingsField>
          <SettingsField label="Model" hint={modelsHint}>
            <ModelSelect
              models={models}
              value={form.model}
              loading={modelsQuery.isFetching}
              disabled={!form.provider}
              placeholder={
                modelsQuery.isFetching
                  ? 'Loading models…'
                  : selectedProvider?.default_model || 'Select model'
              }
              onChange={form.setModel}
            />
          </SettingsField>
        </SimpleGrid>

        {selectedProvider?.docs_url ? (
          <Text fontSize="xs" color="fg.subtle" mt={2}>
            API keys: {selectedProvider.docs_url}
          </Text>
        ) : null}

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={6}>
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
                panel?.ai_api_key_set
                  ? 'Leave blank to keep current'
                  : selectedProvider?.api_key_hint
              }
            />
          </SettingsField>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={6}>
          <SettingsField label="Timeout (seconds)" hint="Agent LLM request timeout">
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
