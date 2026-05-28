import { Box, Button, HStack, SimpleGrid, Text } from '@chakra-ui/react'
import { Bot, CalendarClock, Check, Circle, Layers, Sparkles, Wrench } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { useAgentLlmSetupQuery } from '../../hooks/queries/use-ai-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { AgentLlmSetupStep, LLMHealth } from '../../lib/api'
import { ListCardRowsSkeleton } from '../ui/PanelSkeleton'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'

function StepRow({ step }: { step: AgentLlmSetupStep }) {
  const accentPalette = useAccentPalette()
  const Icon = step.ok ? Check : Circle

  return (
    <HStack align="flex-start" gap={3} py={2}>
      <Box
        flexShrink={0}
        mt={0.5}
        color={step.ok ? 'green.500' : 'fg.subtle'}
        colorPalette={step.ok ? 'green' : accentPalette}
      >
        <Icon size={16} strokeWidth={step.ok ? 2.5 : 1.5} />
      </Box>
      <Box minW={0} flex={1}>
        <HStack gap={2} flexWrap="wrap">
          <Text fontSize="sm" fontWeight="medium">
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
  health,
  onTestConnection,
  testing,
}: {
  health?: LLMHealth
  onTestConnection?: () => void
  testing?: boolean
}) {
  const accentPalette = useAccentPalette()
  const setupQuery = useAgentLlmSetupQuery()
  const setup = setupQuery.data

  if (setupQuery.isLoading && !setup) {
    return (
      <SectionCard mb={4}>
        <ListCardRowsSkeleton rows={4} />
      </SectionCard>
    )
  }

  if (!setup) return null

  const displayHealth = health ?? setup.health ?? undefined
  const completed = setup.steps.filter((s) => s.ok && !s.optional).length
  const required = setup.steps.filter((s) => !s.optional).length

  return (
    <SectionCard mb={4}>
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3} mb={4}>
        <Box minW={0}>
          <Text fontSize="sm" fontWeight="semibold">
            Agent setup workflow
          </Text>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            Connect the LLM, verify the endpoint, then use chat, cron jobs, skills, and gateway
            tools — one model drives the whole agent control plane.
          </Text>
        </Box>
        <HStack gap={2} flexShrink={0}>
          <StatusBadge
            status={setup.chat_ready ? 'success' : setup.setup_complete ? 'running' : 'neutral'}
            label={
              setup.chat_ready ? 'Ready' : setup.setup_complete ? 'Almost ready' : 'Setup needed'
            }
          />
          <Text fontSize="xs" color="fg.subtle">
            {completed}/{required} required
          </Text>
        </HStack>
      </HStack>

      <Box
        mb={4}
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-card)"
        bg="bg.elevated"
        px={3}
      >
        {setup.steps.map((step, index) => (
          <Box
            key={step.id}
            py={2}
            borderBottomWidth={index < setup.steps.length - 1 ? '1px' : undefined}
            borderColor="border.subtle"
          >
            <StepRow step={step} />
          </Box>
        ))}
      </Box>

      {displayHealth ? (
        <Box
          mb={4}
          px={3}
          py={2}
          borderRadius="var(--radius-input)"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.panel"
        >
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <Text fontSize="xs" color="fg.muted">
              Last connection check: {displayHealth.message}
            </Text>
            <StatusBadge
              status={displayHealth.ok ? 'success' : 'danger'}
              label={displayHealth.status}
            />
          </HStack>
        </Box>
      ) : null}

      <Text fontSize="xs" fontWeight="semibold" color="fg.subtle" mb={2} textTransform="uppercase">
        Gateway agent capabilities
      </Text>
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={2} mb={4}>
        <CapabilityLink
          to="/agent/chat"
          label="Chat"
          value={setup.chat_ready ? 'Open' : 'Configure LLM'}
          icon={Bot}
        />
        <CapabilityLink
          to="/agent/skills"
          label="Skills"
          value={`${setup.gateway.enabled_skills_count}/${setup.gateway.skills_count} on`}
          icon={Sparkles}
        />
        <CapabilityLink
          to="/agent/schedules"
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

      <HStack gap={2} flexWrap="wrap">
        {onTestConnection ? (
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            colorPalette={accentPalette}
            loading={testing}
            onClick={onTestConnection}
          >
            Test connection
          </Button>
        ) : null}
        <Button
          asChild
          size="sm"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
        >
          <RouterLink to="/guides">Setup guides</RouterLink>
        </Button>
        {setup.chat_ready ? (
          <Button asChild size="sm" colorPalette={accentPalette} borderRadius="var(--radius-input)">
            <RouterLink to="/agent/chat">Open agent chat</RouterLink>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost" borderRadius="input">
          <RouterLink to="/agent/workflows">
            <HStack gap={1}>
              <Layers size={14} />
              <Text>Pipelines</Text>
            </HStack>
          </RouterLink>
        </Button>
      </HStack>
    </SectionCard>
  )
}
