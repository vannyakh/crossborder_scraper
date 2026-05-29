import { Badge, Box, HStack, IconButton, Menu, Portal, Text } from '@chakra-ui/react'
import { Maximize2, MoreVertical } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useChartTheme } from '../../hooks/use-chart-theme'
import { useLocale } from '../../hooks/use-locale'
import { notifySuccess } from '../../lib/toast'
import { EChart } from '../charts/EChart'
import {
  formatMetricSnapshot,
  latestAcrossSeries,
  METRIC_UNIT_KEYS,
  peakAcrossSeries,
} from './project-observability-utils'
import { buildRuntimeChartOption } from './project-runtime-chart'
import {
  initialRuntimeChartPrefs,
  ProjectRuntimeMetricFullscreen,
} from './ProjectRuntimeMetricFullscreen'
import type { ProjectRuntimeMetrics, RuntimeMetricId } from './project-runtime-metrics'

const CHART_HEIGHT = 'min(260px, 32vh)'

type MetricCardProps = {
  metric: RuntimeMetricId
  title: string
  metrics: ProjectRuntimeMetrics
}

export function ProjectRuntimeMetricCard({ metric, title, metrics }: MetricCardProps) {
  const { t } = useLocale()
  const theme = useChartTheme()
  const [expanded, setExpanded] = useState(false)
  const [prefs, setPrefs] = useState(() => initialRuntimeChartPrefs(metric))

  const seriesData = metrics[metric]
  const peak = useMemo(() => peakAcrossSeries(seriesData), [seriesData])
  const latest = useMemo(() => latestAcrossSeries(seriesData), [seriesData])

  const option = useMemo(
    () => buildRuntimeChartOption(theme, metric, metrics, 'compact', prefs, t),
    [metric, metrics, prefs, t, theme],
  )

  const patchPrefs = (patch: Partial<typeof prefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }))
  }

  return (
    <>
      <Box className="project-runtime-metric-card">
        <HStack
          className="project-runtime-metric-card__header"
          justify="space-between"
          align="flex-start"
          gap={2}
        >
          <Box minW={0}>
            <HStack gap={2} flexWrap="wrap">
              <Text fontWeight="semibold" fontSize="sm">
                {title}
              </Text>
              <Badge
                size="sm"
                variant="outline"
                colorPalette="gray"
                fontFamily="mono"
                textTransform="none"
              >
                {t(METRIC_UNIT_KEYS[metric])}
              </Badge>
            </HStack>
            <HStack gap={3} mt={1.5} fontSize="xs" color="fg.muted">
              <Text>
                {t('projects.runtime.peak')}:{' '}
                <Text as="span" color="fg" fontWeight="medium" fontFamily="mono">
                  {formatMetricSnapshot(metric, peak)}
                </Text>
              </Text>
              <Text display={{ base: 'none', sm: 'block' }}>
                {t('projects.runtime.now')}:{' '}
                <Text as="span" color="fg" fontWeight="medium" fontFamily="mono">
                  {formatMetricSnapshot(metric, latest)}
                </Text>
              </Text>
            </HStack>
          </Box>

          <HStack gap={0} flexShrink={0}>
            <IconButton
              aria-label={t('projects.runtime.expand')}
              size="xs"
              variant="ghost"
              color="fg.muted"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 size={16} />
            </IconButton>
            <Menu.Root positioning={{ placement: 'bottom-end' }}>
              <Menu.Trigger asChild>
                <IconButton
                  aria-label={t('projects.runtime.chartMenu')}
                  size="xs"
                  variant="ghost"
                  color="fg.muted"
                >
                  <MoreVertical size={16} />
                </IconButton>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content minW="11rem">
                    <Menu.Item
                      value="fill"
                      onClick={() => patchPrefs({ fillArea: !prefs.fillArea })}
                    >
                      {prefs.fillArea
                        ? t('projects.runtime.hideFill')
                        : t('projects.runtime.showFill')}
                    </Menu.Item>
                    <Menu.Item
                      value="scale"
                      onClick={() => patchPrefs({ autoScale: !prefs.autoScale })}
                    >
                      {prefs.autoScale
                        ? t('projects.runtime.fixedScale')
                        : t('projects.runtime.autoScale')}
                    </Menu.Item>
                    <Menu.Item value="expand" onClick={() => setExpanded(true)}>
                      {t('projects.runtime.expand')}
                    </Menu.Item>
                    <Menu.Item
                      value="refresh"
                      onClick={() => notifySuccess(t('projects.runtime.refreshQueued'))}
                    >
                      {t('projects.runtime.refresh')}
                    </Menu.Item>
                    <Menu.Item
                      value="export"
                      onClick={() => notifySuccess(t('projects.runtime.exportQueued'))}
                    >
                      {t('projects.runtime.exportCsv')}
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </HStack>
        </HStack>

        <Box
          className="project-runtime-metric-card__chart project-runtime-metric-card__chart--interactive"
          onDoubleClick={() => setExpanded(true)}
          title={t('projects.runtime.expandDblClick')}
        >
          <EChart option={option} height={CHART_HEIGHT} className="project-runtime-chart" />
        </Box>
      </Box>

      <ProjectRuntimeMetricFullscreen
        open={expanded}
        metric={metric}
        title={title}
        metrics={metrics}
        prefs={prefs}
        onPrefsChange={patchPrefs}
        onClose={() => setExpanded(false)}
      />
    </>
  )
}
