import { Box, Button, HStack, Input, SimpleGrid, Text } from '@chakra-ui/react'
import { BookOpen, Bot, CalendarClock, Check, Circle, Sparkles, Wrench } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { formatModelRef } from '../../config/llm-providers'
import { useAgentLlmSetupQuery, useLlmModelsQuery, useLlmProvidersQuery } from '../../hooks'
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

  const modelsHint = modelsQuery.isError
    ? 'Could not load models from provider'
    : modelsQuery.data?.message ||
      (modelsQuery.data?.source === 'api'
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
              disabled={!form.provider || modelsQuery.isFetching || modelOptions.length === 0}
              placeholder={
                modelsQuery.isFetching
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
