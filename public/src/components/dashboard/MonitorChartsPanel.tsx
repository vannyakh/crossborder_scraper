import { Box, HStack, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useChartTheme } from '../../hooks/use-chart-theme'
import { EChart } from '../charts/EChart'
import { multiLineOption } from '../charts/chart-options'
import { Panel, PanelBody, PanelHeader } from '../ui/Panel'
import type { ActivitySample } from './use-activity-samples'
import type { HardwareSample } from './use-hardware-samples'

function formatTime(t: number): string {
  return new Date(t).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function WorkloadChart({ samples }: { samples: ActivitySample[] }) {
  const theme = useChartTheme()
  const option = useMemo(() => {
    if (samples.length < 2) return null
    return multiLineOption(theme, {
      labels: samples.map((s) => formatTime(s.t)),
      series: [
        { name: 'Active tasks', data: samples.map((s) => s.active), color: theme.accent },
        {
          name: 'Running batches',
          data: samples.map((s) => s.running),
          color: theme.secondary,
        },
      ],
    })
  }, [samples, theme])

  const latest = samples[samples.length - 1]

  return (
    <Panel h="full">
      <PanelHeader title="Workload" description="Active tasks and running batches" />
      <PanelBody>
        <LegendRow
          items={[
            { color: theme.accent, label: 'Active tasks', value: latest?.active ?? 0 },
            { color: theme.secondary, label: 'Running batches', value: latest?.running ?? 0 },
          ]}
        />
        {!option ? (
          <Text fontSize="sm" color="fg.muted">
            Collecting samples…
          </Text>
        ) : (
          <EChart option={option} height={200} />
        )}
      </PanelBody>
    </Panel>
  )
}

export function HardwareTrendChart({ samples }: { samples: HardwareSample[] }) {
  const theme = useChartTheme()
  const option = useMemo(() => {
    if (samples.length < 2) return null
    return multiLineOption(theme, {
      labels: samples.map((s) => formatTime(s.t)),
      series: [
        { name: 'CPU %', data: samples.map((s) => s.cpu), color: theme.accent },
        { name: 'Memory %', data: samples.map((s) => s.memory), color: theme.success },
        { name: 'Disk %', data: samples.map((s) => s.disk), color: theme.secondary },
      ],
    })
  }, [samples, theme])

  const latest = samples[samples.length - 1]

  return (
    <Panel h="full">
      <PanelHeader title="Hardware trend" description="CPU, memory, and disk utilization" />
      <PanelBody>
        <LegendRow
          items={[
            { color: theme.accent, label: 'CPU', value: `${latest?.cpu ?? 0}%` },
            { color: theme.success, label: 'RAM', value: `${latest?.memory ?? 0}%` },
            { color: theme.secondary, label: 'Disk', value: `${latest?.disk ?? 0}%` },
          ]}
        />
        {!option ? (
          <Text fontSize="sm" color="fg.muted">
            Collecting samples…
          </Text>
        ) : (
          <EChart option={option} height={200} />
        )}
      </PanelBody>
    </Panel>
  )
}

function LegendRow({
  items,
}: {
  items: { color: string; label: string; value: string | number }[]
}) {
  return (
    <HStack gap={4} flexWrap="wrap" fontSize="xs" mb={3}>
      {items.map((item) => (
        <HStack key={item.label} gap={1.5}>
          <Box w={2} h={2} borderRadius="full" bg={item.color} />
          <Text color="fg.muted">
            {item.label}{' '}
            <Text as="span" color="fg" fontWeight="semibold">
              {item.value}
            </Text>
          </Text>
        </HStack>
      ))}
    </HStack>
  )
}
