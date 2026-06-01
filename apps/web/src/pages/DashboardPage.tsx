import { Box, Grid, Text, VStack } from '@chakra-ui/react'
import { HardwareGaugePanel } from '../components/dashboard/HardwareGaugePanel'
import { HardwareTrendChart, WorkloadChart } from '../components/dashboard/MonitorChartsPanel'
import { OverviewPanel } from '../components/dashboard/OverviewPanel'
import { RunningBatchesPanel } from '../components/dashboard/RunningBatchesPanel'
import { ServiceGaugePanel } from '../components/dashboard/ServiceGaugePanel'
import { ToolsPanel } from '../components/dashboard/ToolsPanel'
import { buildSoftwareToolSections } from '../config/software-tools'
import { useActivitySamples } from '../components/dashboard/use-activity-samples'
import { useHardwareSamples } from '../components/dashboard/use-hardware-samples'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import {
  useAgentSchedulesQuery,
  useGatewayStatusQuery,
  useLLMHealthQuery,
  useMarketplacesQuery,
  useMonitorStatusQuery,
  useServiceOverviewQuery,
  useStatsQuery,
} from '../hooks'

export function DashboardPage() {
  const monitor = useMonitorStatusQuery()
  const gateway = useGatewayStatusQuery()
  const serviceOverview = useServiceOverviewQuery()
  const stats = useStatsQuery()
  const runtime = monitor.data?.service ?? gateway.data?.runtime
  const hardware = monitor.data?.hardware
  const llm = useLLMHealthQuery(Boolean(runtime?.ai?.ai_enabled))
  const schedules = useAgentSchedulesQuery()
  const marketplaces = useMarketplacesQuery()
  const activitySamples = useActivitySamples(runtime)
  const hardwareSamples = useHardwareSamples(hardware)

  // True only on the initial fetch — subsequent refreshes keep showing data
  const hardwareLoading = monitor.isLoading && !monitor.data
  const runtimeLoading = monitor.isLoading && !monitor.data && gateway.isLoading && !gateway.data
  const overviewLoading = runtimeLoading || (serviceOverview.isLoading && !serviceOverview.data)
  const chartsLoading = hardwareLoading
  const toolsLoading = serviceOverview.isLoading && !serviceOverview.data

  const maxJobs = runtime?.engine.max_concurrent_jobs ?? 3
  const active = runtime?.active_tasks ?? 0
  const running = runtime?.running_batches.length ?? stats.data?.running_batches ?? 0
  const products = runtime?.storage.products ?? stats.data?.products ?? 0
  const files = runtime?.storage.output_files ?? stats.data?.output_files ?? 0
  const proxies = runtime?.engine.proxy_count ?? 0

  const marketplaceConfigured = marketplaces.data?.items.filter((m) => m.configured).length ?? 0

  const enabledSchedules = schedules.data?.items.filter((s) => s.enabled).length ?? 0
  const gatewaySummary = serviceOverview.data?.gateway
  const recentFailures = gatewaySummary?.recent_failed_runs ?? 0

  const toolSections = buildSoftwareToolSections({
    runtime,
    llm: llm.data,
    gateway: gatewaySummary,
    runningBatches: running,
    products,
    files,
    enabledSchedules,
    recentFailures,
  })

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
            loading={runtimeLoading}
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
            scheduleCount={enabledSchedules}
            marketplaceConfigured={marketplaceConfigured}
            failedRunCount={recentFailures}
            loading={overviewLoading}
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
                <HardwareTrendChart samples={hardwareSamples} loading={chartsLoading} />
              </Box>
              <Box minH={{ base: 'auto', xl: 'min(440px, 48vh)' }}>
                <WorkloadChart samples={activitySamples} loading={chartsLoading} />
              </Box>
            </Grid>
          </Box>
        </StaggerItem>

        <StaggerItem>
          <ToolsPanel sections={toolSections} loading={toolsLoading} />
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
