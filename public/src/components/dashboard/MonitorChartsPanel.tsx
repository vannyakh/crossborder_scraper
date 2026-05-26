import { Box, Grid, HStack, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useChartTheme } from '../../hooks/use-chart-theme'
import { EChart } from '../charts/EChart'
import { multiLineOption } from '../charts/chart-options'
import { Section, SectionCard } from '../ui/Section'
import {
  formatChartTime,
  formatPercent,
  formatPeriodRange,
  formatSamplePeriod,
  sampleAverage,
  samplePeak,
} from './chart-utils'
import type { ActivitySample } from './use-activity-samples'
import type { HardwareSample } from './use-hardware-samples'

const CHART_HEIGHT = 'min(360px, 42vh)'

type StatItem = {
  label: string
  value: string
  hint?: string
  color?: string
}

function ChartStatsBar({ items }: { items: StatItem[] }) {
  return (
    <Grid
      templateColumns={{ base: '1fr 1fr', md: `repeat(${Math.min(items.length, 4)}, 1fr)` }}
      gap={0}
      mb={4}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-card)"
      overflow="hidden"
      bg="bg.panel"
    >
      {items.map((item, index) => (
        <Box
          key={item.label}
          px={{ base: 3, md: 4 }}
          py={3}
          borderColor="border.subtle"
          borderTopWidth={{ base: index >= 2 ? '1px' : 0, md: 0 }}
          borderLeftWidth={{ base: index % 2 === 1 ? '1px' : 0, md: index > 0 ? '1px' : 0 }}
        >
          <HStack gap={2}>
            {item.color ? (
              <Box w="8px" h="8px" borderRadius="full" bg={item.color} flexShrink={0} />
            ) : null}
            <Text fontSize="xs" color="fg.muted">
              {item.label}
            </Text>
          </HStack>
          <Text mt={1.5} fontSize={{ base: 'md', md: 'lg' }} fontWeight="semibold" color="fg">
            {item.value}
          </Text>
          {item.hint ? (
            <Text mt={0.5} fontSize="xs" color="fg.muted">
              {item.hint}
            </Text>
          ) : null}
        </Box>
      ))}
    </Grid>
  )
}

function TrendChartCard({
  title,
  description,
  period,
  range,
  stats,
  ready,
  option,
}: {
  title: string
  description: string
  period: string
  range: string
  stats: StatItem[]
  ready: boolean
  option: ReturnType<typeof multiLineOption> | null
}) {
  return (
    <Section
      title={title}
      description={description}
      mt={0}
      action={
        <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
          {period}
        </Text>
      }
    >
      <SectionCard p={{ base: 3, md: 4 }} h="full" display="flex" flexDirection="column">
        <ChartStatsBar items={stats} />
        <Text mb={2} fontSize="xs" color="fg.muted">
          {range} · {ready ? 'Live' : 'Collecting…'}
        </Text>
        {!option ? (
          <Box
            flex={1}
            minH={CHART_HEIGHT}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="sm" color="fg.muted">
              Collecting samples…
            </Text>
          </Box>
        ) : (
          <EChart option={option} height={CHART_HEIGHT} className="chart-trend-panel" />
        )}
      </SectionCard>
    </Section>
  )
}

export function WorkloadChart({ samples }: { samples: ActivitySample[] }) {
  const theme = useChartTheme()
  const latest = samples[samples.length - 1]
  const period = formatSamplePeriod(samples)
  const range = formatPeriodRange(samples)
  const activeValues = samples.map((s) => s.active)
  const runningValues = samples.map((s) => s.running)

  const option = useMemo(() => {
    if (samples.length < 2) return null
    return multiLineOption(theme, {
      labels: samples.map((s) => formatChartTime(s.t)),
      series: [
        { name: 'Active tasks', data: activeValues, color: theme.accent },
        { name: 'Running batches', data: runningValues, color: theme.secondary },
      ],
    })
  }, [samples, theme, activeValues, runningValues])

  return (
    <TrendChartCard
      title="Workload"
      description="Active tasks and running batches"
      period={period}
      range={range}
      ready={samples.length >= 2}
      stats={[
        {
          label: 'Active tasks',
          value: String(latest?.active ?? 0),
          hint: `Peak ${samplePeak(activeValues)}`,
          color: theme.accent,
        },
        {
          label: 'Running batches',
          value: String(latest?.running ?? 0),
          hint: `Peak ${samplePeak(runningValues)}`,
          color: theme.secondary,
        },
        {
          label: 'Avg active',
          value: sampleAverage(activeValues).toFixed(1),
          hint: `${samples.length} samples`,
        },
        {
          label: 'Window',
          value: period,
          hint: range,
        },
      ]}
      option={option}
    />
  )
}

export function HardwareTrendChart({ samples }: { samples: HardwareSample[] }) {
  const theme = useChartTheme()
  const latest = samples[samples.length - 1]
  const period = formatSamplePeriod(samples)
  const range = formatPeriodRange(samples)
  const cpuValues = samples.map((s) => s.cpu)
  const memValues = samples.map((s) => s.memory)
  const diskValues = samples.map((s) => s.disk)

  const option = useMemo(() => {
    if (samples.length < 2) return null
    return multiLineOption(theme, {
      labels: samples.map((s) => formatChartTime(s.t)),
      yMax: 100,
      series: [
        { name: 'CPU %', data: cpuValues, color: theme.accent },
        { name: 'Memory %', data: memValues, color: theme.success },
        { name: 'Disk %', data: diskValues, color: theme.secondary },
      ],
    })
  }, [samples, theme, cpuValues, memValues, diskValues])

  return (
    <TrendChartCard
      title="Hardware trend"
      description="CPU, memory, and disk utilization"
      period={period}
      range={range}
      ready={samples.length >= 2}
      stats={[
        {
          label: 'CPU',
          value: formatPercent(latest?.cpu ?? 0),
          hint: `Avg ${formatPercent(sampleAverage(cpuValues))}`,
          color: theme.accent,
        },
        {
          label: 'Memory',
          value: formatPercent(latest?.memory ?? 0),
          hint: `Peak ${formatPercent(samplePeak(memValues))}`,
          color: theme.success,
        },
        {
          label: 'Disk',
          value: formatPercent(latest?.disk ?? 0),
          hint: `Avg ${formatPercent(sampleAverage(diskValues))}`,
          color: theme.secondary,
        },
        {
          label: 'Window',
          value: period,
          hint: range,
        },
      ]}
      option={option}
    />
  )
}
