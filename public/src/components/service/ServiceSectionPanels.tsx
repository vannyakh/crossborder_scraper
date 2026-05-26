import {
  Box,
  Button,
  HStack,
  SimpleGrid,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  BookOpen,
  ExternalLink,
  MessageCircle,
  RefreshCw,
} from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { formatUptime } from '../dashboard/dashboard-utils'
import { Section, SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { useAccentPalette } from '../../hooks/use-ui-config'
import {
  useCheckLLMHealthMutation,
  useServiceOverviewQuery,
} from '../../hooks'
import type { LLMHealth, ServiceGatewaySummary } from '../../lib/api'

function GatewaySummaryCard({ gateway }: { gateway: ServiceGatewaySummary }) {
  return (
    <Box
      p={3}
      mb={4}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-card)"
      bg="bg.elevated"
    >
      <HStack justify="space-between" flexWrap="wrap" gap={2} mb={2}>
        <Text fontSize="sm" fontWeight="semibold">
          Gateway agent
        </Text>
        <RouterLink to="/agent/chat" style={{ color: 'var(--app-accent)', fontSize: '0.75rem' }}>
          Open agent →
        </RouterLink>
      </HStack>
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={2} fontSize="sm">
        <Text color="fg.muted">
          Tools:{' '}
          <Text as="span" fontWeight="medium" color="fg">
            {gateway.tools_count}
          </Text>
        </Text>
        <Text color="fg.muted">
          Workflows:{' '}
          <Text as="span" fontWeight="medium" color="fg">
            {gateway.workflows_count}
          </Text>
        </Text>
        <Text color="fg.muted">
          Schedules:{' '}
          <Text as="span" fontWeight="medium" color="fg">
            {gateway.enabled_schedules_count}/{gateway.schedules_count}
          </Text>
        </Text>
        <Text color="fg.muted">
          Recent failures:{' '}
          <Text as="span" fontWeight="medium" color={gateway.recent_failed_runs ? 'red.500' : 'fg'}>
            {gateway.recent_failed_runs}
          </Text>
        </Text>
      </SimpleGrid>
    </Box>
  )
}

function healthTone(ok: boolean | undefined): 'success' | 'danger' | 'neutral' {
  if (ok === true) return 'success'
  if (ok === false) return 'danger'
  return 'neutral'
}

function HealthCard({
  title,
  status,
  statusLabel,
  children,
}: {
  title: string
  status: 'success' | 'danger' | 'neutral' | 'running'
  statusLabel: string
  children: React.ReactNode
}) {
  return (
    <Box
      p={4}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-card)"
      bg="bg.panel"
    >
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight="semibold">
          {title}
        </Text>
        <StatusBadge status={status} label={statusLabel} />
      </HStack>
      {children}
    </Box>
  )
}

export function ServiceHealthSection() {
  const accentPalette = useAccentPalette()
  const { data: overview, isLoading, error } = useServiceOverviewQuery()
  const runtime = overview?.runtime
  const checkMutation = useCheckLLMHealthMutation()
  const health: LLMHealth | undefined = checkMutation.data ?? overview?.llm ?? undefined
  const aiEnabled = runtime?.ai?.ai_enabled ?? false

  return (
    <Section
      title="Health"
      description="Scrape engine status, gateway agent, and LLM connectivity"
      mt={0}
    >
      {error ? (
        <SectionCard>
          <Text fontSize="sm" color="red.500">
            {String((error as Error).message || error)}
          </Text>
        </SectionCard>
      ) : isLoading ? (
        <SectionCard>
          <Text fontSize="sm" color="fg.muted">
            Loading…
          </Text>
        </SectionCard>
      ) : (
        <>
          {overview?.gateway ? <GatewaySummaryCard gateway={overview.gateway} /> : null}
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
            <HealthCard
              title="Scrape engine"
              status={runtime ? 'success' : 'neutral'}
              statusLabel={runtime ? 'online' : 'checking…'}
            >
              {runtime ? (
                <VStack align="stretch" gap={1} fontSize="sm" color="fg.muted">
                  <Text>
                    {runtime.service} v{runtime.version}
                  </Text>
                  <Text>Workers: {runtime.engine.max_concurrent_jobs}</Text>
                  <Text>Active tasks: {runtime.active_tasks}</Text>
                  <Text>Running batches: {runtime.running_batches.length}</Text>
                  <Text>Uptime: {formatUptime(runtime.uptime_seconds)}</Text>
                </VStack>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  Unavailable
                </Text>
              )}
            </HealthCard>

            <HealthCard
              title="LLM provider"
              status={!aiEnabled ? 'neutral' : healthTone(health?.ok)}
              statusLabel={!aiEnabled ? 'disabled' : health?.status ?? 'checking…'}
            >
              {!aiEnabled ? (
                <Text fontSize="sm" color="fg.muted">
                  AI extraction is off. Enable it in{' '}
                  <RouterLink to="/settings/ai" style={{ color: 'var(--app-accent)' }}>
                    Settings → AI & LLM
                  </RouterLink>
                  .
                </Text>
              ) : health ? (
                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" color="fg.muted">
                    {health.message}
                  </Text>
                  {health.model ? (
                    <Text fontSize="xs" color="fg.subtle">
                      Model: {health.model}
                    </Text>
                  ) : null}
                  {health.base_url ? (
                    <Text
                      fontSize="xs"
                      fontFamily="mono"
                      color="fg.subtle"
                      lineClamp={1}
                      truncate
                      title={health.base_url}
                    >
                      {health.base_url}
                    </Text>
                  ) : null}
                </VStack>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  Run a probe to check the provider.
                </Text>
              )}
              {aiEnabled ? (
                <Button
                  mt={3}
                  size="sm"
                  variant="outline"
                  colorPalette={accentPalette}
                  loading={checkMutation.isPending}
                  onClick={() => void checkMutation.mutate()}
                >
                  <RefreshCw size={14} />
                  Test LLM connection
                </Button>
              ) : null}
            </HealthCard>
          </SimpleGrid>

          {runtime?.running_batches.length ? (
            <SectionCard mt={4}>
              <Text fontSize="sm" fontWeight="semibold" mb={3}>
                Running batches
              </Text>
              <Box overflowX="auto" className="app-scroll">
                <Table.Root size="sm" variant="line">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Batch</Table.ColumnHeader>
                      <Table.ColumnHeader>Progress</Table.ColumnHeader>
                      <Table.ColumnHeader>OK</Table.ColumnHeader>
                      <Table.ColumnHeader>Failed</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {runtime.running_batches.map((batch) => (
                      <Table.Row key={batch.batch_id}>
                        <Table.Cell fontFamily="mono" fontSize="xs">
                          {batch.batch_id.slice(0, 12)}…
                        </Table.Cell>
                        <Table.Cell>
                          {batch.completed}/{batch.total}
                        </Table.Cell>
                        <Table.Cell>{batch.success}</Table.Cell>
                        <Table.Cell>{batch.failed}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </SectionCard>
          ) : null}
        </>
      )}
    </Section>
  )
}

function SupportLink({
  href,
  label,
  description,
  external,
}: {
  href: string
  label: string
  description: string
  external?: boolean
}) {
  const content = (
    <>
      <HStack justify="space-between" align="flex-start">
        <Box flex={1} minW={0}>
          <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
            {label}
          </Text>
          <Text mt={0.5} fontSize="xs" color="fg.muted" lineClamp={1} truncate title={description}>
            {description}
          </Text>
        </Box>
        {external ? <ExternalLink size={14} /> : null}
      </HStack>
    </>
  )

  const boxProps = {
    display: 'block' as const,
    p: 3,
    borderWidth: '1px' as const,
    borderColor: 'border.subtle',
    borderRadius: 'var(--radius-card)',
    bg: 'bg.panel',
    _hover: { borderColor: 'border.emphasized', bg: 'bg.elevated' },
    transition: 'border-color var(--motion-duration), background-color var(--motion-duration)',
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Box {...boxProps}>{content}</Box>
      </a>
    )
  }

  return (
    <RouterLink to={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Box {...boxProps}>{content}</Box>
    </RouterLink>
  )
}

export function ServiceSupportSection() {
  const { data: overview } = useServiceOverviewQuery()
  const runtime = overview?.runtime

  return (
    <Section title="Support" description="Documentation, logs, and configuration shortcuts" mt={0}>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mb={5}>
        <SupportLink
          href="/logs"
          label="Operation logs"
          description="Search scrape runs, cron jobs, and panel events"
        />
        <SupportLink
          href="/health"
          label="Health"
          description="Engine status, gateway summary, and LLM probe"
        />
        <SupportLink
          href="/agent/chat"
          label="Gateway agent"
          description="Chat, workflows, schedules, and tool catalog"
        />
        <SupportLink
          href="/settings/panel"
          label="Panel configuration"
          description="Config paths, AI, scrape engine, and marketplaces"
        />
        <SupportLink
          href="/"
          label="Monitoring dashboard"
          description="Hardware gauges, charts, and runtime overview"
        />
        <SupportLink
          href="https://github.com"
          label="Documentation"
          description="Setup guides and exporter reference"
          external
        />
      </SimpleGrid>

      <SectionCard>
        <HStack gap={2} mb={3}>
          <MessageCircle size={16} />
          <Text fontSize="sm" fontWeight="semibold">
            Need help?
          </Text>
        </HStack>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          Check logs for scrape failures, verify health on the Health page, and review proxy settings
          if sites block requests.
        </Text>
        {runtime ? (
          <Box pt={3} borderTopWidth="1px" borderColor="border.subtle">
            <HStack gap={2} mb={2} color="fg.muted">
              <BookOpen size={14} />
              <Text fontSize="xs" fontWeight="semibold">
                Installed build
              </Text>
            </HStack>
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2} fontSize="sm">
              <Text color="fg.muted">
                Service:{' '}
                <Text as="span" fontWeight="medium" color="fg">
                  {runtime.service} v{runtime.version}
                </Text>
              </Text>
              <Text color="fg.muted">
                Uptime:{' '}
                <Text as="span" fontWeight="medium" color="fg">
                  {formatUptime(runtime.uptime_seconds)}
                </Text>
              </Text>
            </SimpleGrid>
          </Box>
        ) : null}
      </SectionCard>
    </Section>
  )
}
