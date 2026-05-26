import { Grid, Text } from '@chakra-ui/react'
import type { HardwareMonitor } from '../../lib/api'
import { useChartTheme } from '../../hooks/use-chart-theme'
import { Panel, PanelBody, PanelHeader } from '../ui/Panel'
import {
  CpuHoverDetail,
  DiskHoverDetail,
  HardwareGaugeHoverCard,
  LoadHoverDetail,
  MemoryHoverDetail,
} from './HardwareGaugeHoverDetail'

export function HardwareGaugePanel({ hardware }: { hardware?: HardwareMonitor }) {
  const theme = useChartTheme()

  if (!hardware) {
    return (
      <Panel>
        <PanelHeader title="Server hardware" description="CPU, memory, disk, and load" />
        <PanelBody>
          <Text fontSize="sm" color="fg.muted">
            Loading hardware metrics…
          </Text>
        </PanelBody>
      </Panel>
    )
  }

  const loadDetail = `${hardware.load.load_1} / ${hardware.load.load_5} / ${hardware.load.load_15}`

  return (
    <Panel>
      <PanelHeader
        title="Server hardware"
        description={hardware.hostname}
      />
      <PanelBody>
        <Grid
          templateColumns={{ base: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' }}
          gap={3}
        >
          <HardwareGaugeHoverCard
            label="CPU"
            detail={`${hardware.cpu.count_logical} cores`}
            percent={hardware.cpu.percent}
            color={theme.accent}
            detailContent={<CpuHoverDetail hardware={hardware} />}
          />
          <HardwareGaugeHoverCard
            label="Memory"
            detail={`${hardware.memory.used_human} / ${hardware.memory.total_human}`}
            percent={hardware.memory.percent}
            color={hardware.memory.percent > 85 ? theme.warning : theme.accent}
            detailContent={<MemoryHoverDetail hardware={hardware} />}
          />
          <HardwareGaugeHoverCard
            label="Disk"
            detail={`${hardware.disk.used_human} / ${hardware.disk.total_human}`}
            percent={hardware.disk.percent}
            color={hardware.disk.percent > 90 ? theme.danger : theme.success}
            detailContent={<DiskHoverDetail hardware={hardware} />}
          />
          <HardwareGaugeHoverCard
            label="Load"
            detail={loadDetail}
            percent={hardware.load.percent}
            color={hardware.load.percent > 80 ? theme.warning : theme.secondary}
            detailContent={<LoadHoverDetail hardware={hardware} />}
          />
        </Grid>
        <Text mt={3} fontSize="xs" color="fg.muted">
          Process RSS {hardware.process.rss_human} · {hardware.process.threads} threads · Python{' '}
          {hardware.python_version}
        </Text>
      </PanelBody>
    </Panel>
  )
}
