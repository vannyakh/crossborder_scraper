import { Box, Grid, Text, VStack } from '@chakra-ui/react'
import { HardwareGaugePanel } from '../components/dashboard/HardwareGaugePanel'
import {
  HardwareTrendChart,
  WorkloadChart,
} from '../components/dashboard/MonitorChartsPanel'
import { OverviewPanel } from '../components/dashboard/OverviewPanel'
import { RunningBatchesPanel } from '../components/dashboard/RunningBatchesPanel'
import { ServiceGaugePanel } from '../components/dashboard/ServiceGaugePanel'
import { ToolsPanel, dashboardToolIcons } from '../components/dashboard/ToolsPanel'
import { useActivitySamples } from '../components/dashboard/use-activity-samples'
import { useHardwareSamples } from '../components/dashboard/use-hardware-samples'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import {
  useAgentSchedulesQuery,
  useGatewayStatusQuery,
  useLLMHealthQuery,
  useMarketplacesQuery,
  useMonitorStatusQuery,
  useStatsQuery,
} from '../hooks'

export function DashboardPage() {
  const monitor = useMonitorStatusQuery()
  const gateway = useGatewayStatusQuery()
  const stats = useStatsQuery()
  const runtime = monitor.data?.service ?? gateway.data?.runtime
  const hardware = monitor.data?.hardware
  const llm = useLLMHealthQuery(Boolean(runtime?.ai?.ai_enabled))
  const schedules = useAgentSchedulesQuery()
  const marketplaces = useMarketplacesQuery()
  const activitySamples = useActivitySamples(runtime)
  const hardwareSamples = useHardwareSamples(hardware)

  const maxJobs = runtime?.engine.max_concurrent_jobs ?? 3
  const active = runtime?.active_tasks ?? 0
  const running = runtime?.running_batches.length ?? stats.data?.running_batches ?? 0
  const products = runtime?.storage.products ?? stats.data?.products ?? 0
  const files = runtime?.storage.output_files ?? stats.data?.output_files ?? 0
  const proxies = runtime?.engine.proxy_count ?? 0

  const marketplaceConfigured =
    marketplaces.data?.items.filter((m) => m.configured).length ?? 0

  const enabledSchedules = schedules.data?.items.filter((s) => s.enabled).length ?? 0

  const toolCards = [
    {
      id: 'batches',
      title: 'Scrape batches',
      description: 'Submit URLs, track live progress, and cancel runs.',
      to: '/batches',
      status: running > 0 ? `${running} running` : 'Idle',
      statusTone: running > 0 ? ('running' as const) : ('neutral' as const),
      icon: dashboardToolIcons.batches,
      primaryAction: { label: 'New batch', to: '/batches' },
    },
    {
      id: 'agent',
      title: 'Gateway agent',
      description: 'LLM tool loop, prompts, and cron schedules.',
      to: '/agent',
      status:
        runtime?.ai?.ai_agent_enabled && enabledSchedules > 0
          ? `${enabledSchedules} schedules`
          : runtime?.ai?.ai_agent_enabled
            ? 'Ready'
            : 'Off',
      statusTone: runtime?.ai?.ai_agent_enabled ? ('success' as const) : ('neutral' as const),
      icon: dashboardToolIcons.agent,
    },
    {
      id: 'products',
      title: 'Product catalog',
      description: 'Browse scraped items and export to marketplaces.',
      to: '/products',
      status: `${products} items`,
      statusTone: 'neutral' as const,
      icon: dashboardToolIcons.products,
    },
    {
      id: 'files',
      title: 'Output files',
      description: 'Download exports and generated listing files.',
      to: '/files',
      status: `${files} files`,
      statusTone: 'neutral' as const,
      icon: dashboardToolIcons.files,
    },
    {
      id: 'settings',
      title: 'Configuration',
      description: 'AI keys, proxy pool, workers, and integrations.',
      to: '/settings',
      status: llm.data?.ok ? 'LLM OK' : runtime?.ai?.ai_enabled ? 'Check LLM' : 'Panel',
      statusTone: llm.data?.ok ? ('success' as const) : ('neutral' as const),
      icon: dashboardToolIcons.settings,
    },
  ]

  return (
    <VStack align="stretch" gap={0}>
      <Stagger>
        <StaggerItem>
          <HardwareGaugePanel hardware={hardware} />
        </StaggerItem>

        <StaggerItem>
          <ServiceGaugePanel
            active={active}
            maxJobs={maxJobs}
            running={running}
            products={products}
            proxies={proxies}
          />
        </StaggerItem>

        <StaggerItem>
          <OverviewPanel
            runtime={runtime}
            stats={stats.data}
            llm={llm.data}
            hardware={hardware}
            gatewayTools={gateway.data?.tools_count ?? 0}
            gatewayWorkflows={gateway.data?.workflows_count ?? 0}
            scheduleCount={schedules.data?.items.length ?? 0}
            marketplaceConfigured={marketplaceConfigured}
          />
        </StaggerItem>

        <StaggerItem>
          <Box mt={5}>
            <Grid
              templateColumns={{ base: '1fr', xl: '1fr 1fr' }}
              gap={6}
              alignItems="stretch"
              w="full"
            >
              <Box minH={{ base: 'auto', xl: 'min(440px, 48vh)' }}>
                <HardwareTrendChart samples={hardwareSamples} />
              </Box>
              <Box minH={{ base: 'auto', xl: 'min(440px, 48vh)' }}>
                <WorkloadChart samples={activitySamples} />
              </Box>
            </Grid>
          </Box>
        </StaggerItem>

        <StaggerItem>
          <ToolsPanel tools={toolCards} />
        </StaggerItem>

        {runtime?.running_batches.length ? (
          <StaggerItem>
            <RunningBatchesPanel batches={runtime.running_batches} />
          </StaggerItem>
        ) : null}

        {monitor.isError ? (
          <StaggerItem>
            <Text mt={5} fontSize="sm" color="red.500">
              {String((monitor.error as Error).message || monitor.error)}
            </Text>
          </StaggerItem>
        ) : null}
      </Stagger>
    </VStack>
  )
}
