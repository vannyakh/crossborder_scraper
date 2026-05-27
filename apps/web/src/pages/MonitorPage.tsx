import { Box, Grid, Text, VStack } from '@chakra-ui/react'
import { HardwareGaugePanel } from '../components/dashboard/HardwareGaugePanel'
import {
  HardwareTrendChart,
  WorkloadChart,
} from '../components/dashboard/MonitorChartsPanel'
import { useActivitySamples } from '../components/dashboard/use-activity-samples'
import { useHardwareSamples } from '../components/dashboard/use-hardware-samples'
import { LiveBatchesPanel } from '../components/monitor/LiveBatchesPanel'
import { LiveConnectionBadge } from '../components/monitor/LiveConnectionBadge'
import { LiveEventFeed } from '../components/monitor/LiveEventFeed'
import { LiveStatsBar } from '../components/monitor/LiveStatsBar'
import { MonitorPanelsSkeleton } from '../components/ui/PanelSkeleton'
import { PageHeader } from '../components/ui/PageHeader'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { useRunningBatchesLive } from '../hooks/use-running-batches-live'
import { useLiveMonitorStatusQuery } from '../hooks/queries/use-monitor-query'

export function MonitorPage() {
  const monitor = useLiveMonitorStatusQuery()
  const runtime = monitor.data?.service
  const hardware = monitor.data?.hardware
  const monitorLoading = monitor.isLoading && !monitor.data
  const runningBatches = runtime?.running_batches ?? []
  const batchIds = runningBatches.map((b) => b.batch_id)

  const live = useRunningBatchesLive(batchIds)
  const hardwareSamples = useHardwareSamples(hardware)
  const activitySamples = useActivitySamples(runtime)

  return (
    <VStack align="stretch" gap={0}>
      <PageHeader
        title="Live monitoring"
        description="Real-time hardware metrics, engine workload, and batch WebSocket streams"
        action={
          <LiveConnectionBadge
            monitorOk={!monitor.isError && Boolean(monitor.data)}
            lastUpdated={monitor.dataUpdatedAt}
            connectedSockets={live.connectedCount}
            totalSockets={live.socketCount}
          />
        }
      />

      <Stagger>
        <StaggerItem>
          <LiveStatsBar runtime={runtime} hardware={hardware} loading={monitorLoading} />
        </StaggerItem>

        <StaggerItem>
          <Box mt={5}>
            <HardwareGaugePanel hardware={hardware} />
          </Box>
        </StaggerItem>

        <StaggerItem>
          <Box mt={5}>
            <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={6} alignItems="stretch">
              <Box minH={{ base: 'auto', xl: 'min(380px, 44vh)' }}>
                <HardwareTrendChart samples={hardwareSamples} loading={monitorLoading} />
              </Box>
              <Box minH={{ base: 'auto', xl: 'min(380px, 44vh)' }}>
                <WorkloadChart samples={activitySamples} loading={monitorLoading} />
              </Box>
            </Grid>
          </Box>
        </StaggerItem>

        <StaggerItem>
          <Box mt={5}>
            {monitorLoading ? (
              <MonitorPanelsSkeleton />
            ) : (
            <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6} alignItems="start">
              <LiveBatchesPanel batches={runningBatches} liveByBatch={live.byBatch} />
              <LiveEventFeed events={live.events} />
            </Grid>
            )}
          </Box>
        </StaggerItem>

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
