import { Box, Button, Code, HStack, Input, SimpleGrid, Text } from '@chakra-ui/react'
import {
  AlertTriangle,
  BookOpen,
  Bot,
  CalendarClock,
  Check,
  Circle,
  Download,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { formatModelRef } from '../../config/llm-providers'
import {
  useAgentLlmSetupQuery,
  useLlmModelsQuery,
  useLlmProvidersQuery,
  useOllamaPullMutation,
} from '../../hooks'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { AgentLlmSetupStep, LLMHealth } from '../../lib/api'
import { agentSectionPath } from '../agent/agent-sections'
import { PanelGuideDialog, usePanelGuideState } from '../guides/PanelGuideViews'
import { PanelSelect } from '../ui/PanelSelect'
import { ListCardRowsSkeleton } from '../ui/PanelSkeleton'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { fieldStyles } from '../ui/field-styles'
import { SettingsCheckbox, SettingsField } from './SettingsFields'
import type { PanelSettingsForm } from './use-panel-settings-form'

const OLLAMA_POPULAR_MODELS = [
  { label: 'llama3.2 (3B)', value: 'llama3.2' },
  { label: 'llama3.1 (8B)', value: 'llama3.1' },
  { label: 'mistral (7B)', value: 'mistral' },
  { label: 'gemma2 (9B)', value: 'gemma2' },
  { label: 'phi3 (3.8B)', value: 'phi3' },
  { label: 'qwen2.5 (7B)', value: 'qwen2.5' },
  { label: 'deepseek-r1 (7B)', value: 'deepseek-r1:7b' },
]

function healthTone(ok: boolean | undefined): 'success' | 'danger' | 'neutral' {
  if (ok === true) return 'success'
  if (ok === false) return 'danger'
  return 'neutral'
}

function StepRow({ step, active }: { step: AgentLlmSetupStep; active: boolean }) {
  const Icon = step.ok ? Check : Circle

  return (
    <HStack align="flex-start" gap={3} py={2}>
      <Box flexShrink={0} mt={0.5} color={step.ok ? 'green.500' : active ? 'fg' : 'fg.subtle'}>
        <Icon size={16} strokeWidth={step.ok ? 2.5 : 1.5} />
      </Box>
      <Box minW={0} flex={1}>
        <HStack gap={2} flexWrap="wrap">
          <Text fontSize="sm" fontWeight={active ? 'semibold' : 'medium'}>
            {step.label}
          </Text>
          {step.optional ? <StatusBadge status="neutral" label="optional" /> : null}
        </HStack>
        <Text fontSize="xs" color="fg.muted" mt={0.5}>
          {step.detail}
        </Text>
      </Box>
    </HStack>
  )
}

function CapabilityLink({
  to,
  label,
  value,
  icon: Icon,
}: {
  to: string
  label: string
  value: string
  icon: typeof Bot
}) {
  return (
    <RouterLink to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Box
        p={3}
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-card)"
        bg="bg.elevated"
        h="full"
        _hover={{ borderColor: 'border.emphasized', bg: 'bg.panelHover' }}
        transition="border-color 0.15s, background 0.15s"
      >
        <HStack gap={2} mb={1}>
          <Icon size={14} strokeWidth={2} color="var(--chakra-colors-fg-muted)" />
          <Text fontSize="xs" color="fg.muted">
            {label}
          </Text>
        </HStack>
        <Text fontSize="sm" fontWeight="semibold">
          {value}
        </Text>
      </Box>
    </RouterLink>
  )
}

export function AgentLlmSetupPanel({
  form,
  health,
}: {
  form: PanelSettingsForm
  health?: LLMHealth
}) {
  const accentPalette = useAccentPalette()
  const guide = usePanelGuideState()
  const setupQuery = useAgentLlmSetupQuery()
  const setup = setupQuery.data
  const providersQuery = useLlmProvidersQuery()
  const providers = providersQuery.data?.providers ?? []
  const selectedProvider = providers.find((p) => p.id === form.provider)
  const modelRef = formatModelRef(form.provider, form.model)

  // Key guard: block model fetch when provider requires an API key and none is set
  const keyIsSet = Boolean(form.panel?.ai_api_key_set) || form.aiApiKey.trim().length > 0
  const requiresKey = selectedProvider?.requires_api_key === true
  const modelSelectionBlocked = requiresKey && !keyIsSet

  const modelsProbe = useMemo(
    () => ({
      ai_provider: form.provider,
      ai_base_url: form.aiBaseUrl,
      ...(form.aiApiKey.trim() ? { ai_api_key: form.aiApiKey.trim() } : {}),
    }),
    [form.provider, form.aiBaseUrl, form.aiApiKey],
  )

  // Disable models query when API key is required but not set
  const modelsQuery = useLlmModelsQuery(modelsProbe, !modelSelectionBlocked)
  const modelsSource = modelsQuery.data?.source
  const models = modelsQuery.data?.models ?? []

  // Ollama-specific state
  const isOllama = form.provider === 'ollama'
  const ollamaOffline = isOllama && modelsSource === 'ollama_offline'
  const ollamaEmpty = isOllama && modelsSource === 'ollama_empty'
  const ollamaBaseUrl = form.aiBaseUrl || 'http://127.0.0.1:11434/v1'

  const [pullModel, setPullModel] = useState(OLLAMA_POPULAR_MODELS[0].value)
  const pullMutation = useOllamaPullMutation()

  const handlePullModel = () => {
    pullMutation.mutate({ model: pullModel, base_url: ollamaBaseUrl })
  }

  useEffect(() => {
    if (!models.length || modelsQuery.isLoading) return
    if (!form.model || !models.some((m) => m.id === form.model)) {
      const preferred =
        models.find((m) => m.id === selectedProvider?.default_model)?.id ?? models[0]?.id
      if (preferred) form.setModel(preferred)
    }
  }, [models, modelsQuery.isLoading, form.model, form.setModel, selectedProvider?.default_model])

  if (setupQuery.isLoading && !setup) {
    return (
      <SectionCard>
        <ListCardRowsSkeleton rows={5} />
      </SectionCard>
    )
  }

  const displayHealth = health ?? setup?.health ?? undefined
  const steps = setup?.steps ?? []
  const completed = steps.filter((s) => s.ok && !s.optional).length
  const required = steps.filter((s) => !s.optional).length
  const progressPct = required > 0 ? Math.round((completed / required) * 100) : 0
  const activeStepId =
    steps.find((s) => !s.ok && !s.optional)?.id ?? steps[steps.length - 1]?.id ?? 'provider'

  const providerOptions = providers.map((p) => ({ label: p.label, value: p.id }))
  const modelOptions = models.map((m) => ({ label: m.label || m.id, value: m.id }))

  const modelsHint = modelSelectionBlocked
    ? `Enter an API key for ${selectedProvider?.label ?? 'this provider'} to load available models`
    : ollamaOffline
      ? 'Ollama is not reachable — install or start it first'
      : ollamaEmpty
        ? 'No models installed — pull one below'
        : modelsQuery.isError
          ? 'Could not load models from provider'
          : modelsQuery.data?.message ||
            (modelsSource === 'api'
              ? 'Models loaded from provider API'
              : 'Add API key or use local Ollama to list models')

  return (
    <SectionCard>
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3} mb={3}>
        <Box minW={0}>
          <Text fontSize="sm" fontWeight="semibold">
            Agent setup workflow
          </Text>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            One provider and model for panel chat, cron jobs, skills, and integrate channels. Save
            after each change, then run Test connection in the bar below.
          </Text>
        </Box>
        <HStack gap={2} flexShrink={0} align="flex-start">
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            colorPalette={accentPalette}
            onClick={() => guide.openGuide('agent-llm')}
          >
            <HStack gap={1.5}>
              <BookOpen size={14} aria-hidden />
              <Text as="span">Setup guides</Text>
            </HStack>
          </Button>
        </HStack>
      </HStack>

      {required > 0 ? (
        <Box mb={4}>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" color="fg.muted">
              Setup progress
            </Text>
            <Text fontSize="xs" color="fg.subtle">
              {progressPct}%
            </Text>
          </HStack>
          <Box h="6px" borderRadius="full" bg="bg.muted" overflow="hidden">
            <Box
              h="full"
              borderRadius="full"
              bg={setup?.chat_ready ? 'green.500' : `${accentPalette}.500`}
              w={`${progressPct}%`}
              transition="width 0.25s ease"
            />
          </Box>
        </Box>
      ) : null}

      {steps.length > 0 ? (
        <Box
          mb={5}
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="var(--radius-card)"
          bg="bg.elevated"
          px={3}
        >
          {steps.map((step, index) => (
            <Box
              key={step.id}
              borderBottomWidth={index < steps.length - 1 ? '1px' : undefined}
              borderColor="border.subtle"
            >
              <StepRow step={step} active={step.id === activeStepId} />
            </Box>
          ))}
        </Box>
      ) : null}

      <Box
        mb={4}
        p={4}
        borderWidth="1px"
        borderColor={activeStepId === 'provider' ? 'border.emphasized' : 'border.subtle'}
        borderRadius="var(--radius-card)"
        bg="bg.panel"
      >
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="fg.subtle"
          mb={3}
          textTransform="uppercase"
        >
          Provider & model
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          <SettingsField
            label="LLM provider"
            hint={
              providersQuery.isError
                ? 'Could not load provider list from server'
                : 'Gateway agent presets from the server catalog'
            }
          >
            <PanelSelect
              value={form.provider}
              options={providerOptions}
              disabled={providersQuery.isLoading}
              placeholder="Choose provider"
              w="full"
              onChange={(id) => form.setProvider(id as typeof form.provider)}
            />
          </SettingsField>
          <SettingsField label="Model" hint={modelsHint}>
            <PanelSelect
              value={form.model}
              options={modelOptions}
              disabled={
                !form.provider ||
                modelSelectionBlocked ||
                ollamaOffline ||
                ollamaEmpty ||
                modelsQuery.isFetching ||
                modelOptions.length === 0
              }
              placeholder={
                modelSelectionBlocked
                  ? 'API key required'
                  : ollamaOffline
                    ? 'Ollama not running'
                    : ollamaEmpty
                      ? 'No models installed'
                      : modelsQuery.isFetching
                        ? 'Loading models…'
                        : selectedProvider?.default_model || 'Select model'
              }
              w="full"
              onChange={form.setModel}
            />
          </SettingsField>
        </SimpleGrid>
        <HStack
          mt={3}
          pt={3}
          borderTopWidth="1px"
          borderColor="border.subtle"
          justify="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Box minW={0}>
            <Text fontSize="xs" color="fg.muted">
              Active model ref
            </Text>
            <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
              {modelRef}
            </Text>
          </Box>
          {displayHealth ? (
            <Box textAlign={{ base: 'left', sm: 'right' }}>
              <HStack gap={2} justify={{ base: 'flex-start', sm: 'flex-end' }} mb={0.5}>
                <Text fontSize="xs" color="fg.muted">
                  Connection
                </Text>
                <StatusBadge status={healthTone(displayHealth.ok)} label={displayHealth.status} />
              </HStack>
              <Text fontSize="xs" color="fg.subtle" maxW="18rem">
                {displayHealth.message}
              </Text>
            </Box>
          ) : null}
        </HStack>
        {selectedProvider?.docs_url ? (
          <Text fontSize="xs" color="fg.subtle" mt={2}>
            API keys: {selectedProvider.docs_url}
          </Text>
        ) : null}
      </Box>

      {/* Ollama offline — install or start Ollama */}
      {ollamaOffline ? (
        <Box
          mb={4}
          p={4}
          borderWidth="1px"
          borderColor="orange.muted"
          borderRadius="var(--radius-card)"
          bg="orange.subtle"
        >
          <HStack gap={2} mb={1}>
            <AlertTriangle size={14} />
            <Text fontSize="sm" fontWeight="semibold">
              Ollama not detected
            </Text>
          </HStack>
          <Text fontSize="xs" color="fg.muted" mb={3}>
            Cannot connect to Ollama at{' '}
            <Code fontSize="xs">{ollamaBaseUrl.replace('/v1', '')}</Code>. Make sure the Ollama
            service is running.
          </Text>
          <HStack gap={2} flexWrap="wrap">
            <Button
              asChild
              size="xs"
              variant="outline"
              borderRadius="var(--radius-input)"
              colorPalette={accentPalette}
            >
              <RouterLink to="/store">
                <ExternalLink size={12} />
                Install from App Store
              </RouterLink>
            </Button>
            <Button
              size="xs"
              variant="ghost"
              borderRadius="var(--radius-input)"
              onClick={() => void modelsQuery.refetch()}
            >
              <RefreshCw size={12} />
              Retry
            </Button>
          </HStack>
        </Box>
      ) : null}

      {/* Ollama running but no models pulled */}
      {ollamaEmpty ? (
        <Box
          mb={4}
          p={4}
          borderWidth="1px"
          borderColor="blue.muted"
          borderRadius="var(--radius-card)"
          bg="blue.subtle"
        >
          <HStack gap={2} mb={1}>
            <Download size={14} />
            <Text fontSize="sm" fontWeight="semibold">
              No local models installed
            </Text>
          </HStack>
          <Text fontSize="xs" color="fg.muted" mb={3}>
            Ollama is running but has no models. Pull a model to start using the local LLM.
          </Text>
          <HStack gap={2} flexWrap="wrap" align="center" mb={2}>
            <Box flex={1} minW="10rem" maxW="16rem">
              <PanelSelect
                value={pullModel}
                options={OLLAMA_POPULAR_MODELS}
                w="full"
                onChange={setPullModel}
              />
            </Box>
            <Button
              size="sm"
              colorPalette={accentPalette}
              borderRadius="var(--radius-input)"
              onClick={handlePullModel}
              loading={pullMutation.isPending}
              disabled={pullMutation.isPending}
            >
              <Download size={13} />
              Pull model
            </Button>
            <Button
              size="sm"
              variant="ghost"
              borderRadius="var(--radius-input)"
              onClick={() => void modelsQuery.refetch()}
            >
              <RefreshCw size={13} />
              Refresh
            </Button>
          </HStack>
          {pullMutation.isSuccess ? (
            <Text fontSize="xs" color="green.600">
              {pullMutation.data?.message}
            </Text>
          ) : null}
          <Text fontSize="xs" color="fg.subtle">
            Or run in terminal:{' '}
            <Code fontSize="xs">
              ollama pull {pullModel}
            </Code>
          </Text>
        </Box>
      ) : null}

      {/* Key guard hint for cloud providers */}
      {modelSelectionBlocked ? (
        <Box
          mb={4}
          p={3}
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="var(--radius-card)"
          bg="bg.elevated"
        >
          <HStack gap={2}>
            <AlertTriangle size={14} color="var(--chakra-colors-fg-muted)" />
            <Text fontSize="xs" color="fg.muted">
              Enter an API key in the <strong>Credentials</strong> section below, then save — model
              list will load automatically.
            </Text>
          </HStack>
        </Box>
      ) : null}

      <Box
        mb={4}
        p={4}
        borderWidth="1px"
        borderColor={activeStepId === 'credentials' ? 'border.emphasized' : 'border.subtle'}
        borderRadius="var(--radius-card)"
        bg="bg.panel"
      >
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="fg.subtle"
          mb={3}
          textTransform="uppercase"
        >
          Credentials & endpoint
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
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
              form.panel?.ai_api_key_set
                ? `Current: ${form.panel.ai_api_key_masked ?? 'set'} · ${selectedProvider?.api_key_hint ?? ''}`
                : selectedProvider?.api_key_hint
            }
          >
            <Input
              {...fieldStyles}
              type="password"
              value={form.aiApiKey}
              onChange={(e) => form.setAiApiKey(e.target.value)}
              placeholder={
                form.panel?.ai_api_key_set
                  ? 'Leave blank to keep current'
                  : selectedProvider?.api_key_hint
              }
            />
          </SettingsField>
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={3}>
          <SettingsField label="Timeout (seconds)" hint="Agent LLM request timeout">
            <Input
              {...fieldStyles}
              type="number"
              value={String(form.timeoutSeconds)}
              onChange={(e) => form.setTimeoutSeconds(Number(e.target.value))}
            />
          </SettingsField>
        </SimpleGrid>
      </Box>

      <Box
        mb={5}
        p={4}
        borderWidth="1px"
        borderColor={activeStepId === 'enable' ? 'border.emphasized' : 'border.subtle'}
        borderRadius="var(--radius-card)"
        bg="bg.panel"
      >
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="fg.subtle"
          mb={3}
          textTransform="uppercase"
        >
          Enable agent
        </Text>
        <SettingsCheckbox checked={form.agentEnabled} onCheckedChange={form.setAgentEnabled}>
          Enable gateway agent LLM
        </SettingsCheckbox>
        <Text fontSize="xs" color="fg.subtle" mt={2}>
          Turn on after connection test passes. Chat, cron, Telegram, and skills share this model.
        </Text>
      </Box>

      {setup ? (
        <>
          <Text
            fontSize="xs"
            fontWeight="semibold"
            color="fg.subtle"
            mb={2}
            textTransform="uppercase"
          >
            Gateway agent capabilities
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={2} mb={4}>
            <CapabilityLink
              to={agentSectionPath('chat')}
              label="Chat"
              value={setup.chat_ready ? 'Open' : 'Configure LLM'}
              icon={Bot}
            />
            <CapabilityLink
              to={agentSectionPath('skills')}
              label="Skills"
              value={`${setup.gateway.enabled_skills_count}/${setup.gateway.skills_count} on`}
              icon={Sparkles}
            />
            <CapabilityLink
              to={agentSectionPath('schedules')}
              label="Cron jobs"
              value={`${setup.gateway.enabled_schedules_count}/${setup.gateway.schedules_count} on`}
              icon={CalendarClock}
            />
            <CapabilityLink
              to="/debug/tools"
              label="Tools"
              value={`${setup.gateway.tools_count} callable`}
              icon={Wrench}
            />
          </SimpleGrid>

          {setup.chat_ready ? (
            <Button
              asChild
              size="sm"
              colorPalette={accentPalette}
              borderRadius="var(--radius-input)"
            >
              <RouterLink to={agentSectionPath('chat')}>Open agent chat</RouterLink>
            </Button>
          ) : null}
        </>
      ) : null}

      <PanelGuideDialog guideId={guide.guideId} open={guide.open} onClose={guide.closeGuide} />
    </SectionCard>
  )
}
