import { Badge, Box, Button, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { Layers, Maximize2, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useChartTheme } from '../../hooks/use-chart-theme'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { EChart } from '../charts/EChart'
import {
  formatMetricSnapshot,
  latestAcrossSeries,
  METRIC_UNIT_KEYS,
  peakAcrossSeries,
} from './project-observability-utils'
import {
  buildRuntimeChartOption,
  defaultFillArea,
  type RuntimeChartPrefs,
} from './project-runtime-chart'
import type { ProjectRuntimeMetrics, RuntimeMetricId } from './project-runtime-metrics'

const EXPANDED_HEIGHT = 'calc(100dvh - 11.5rem)'

type FullscreenProps = {
  open: boolean
  metric: RuntimeMetricId
  title: string
  metrics: ProjectRuntimeMetrics
  prefs: RuntimeChartPrefs
  onPrefsChange: (patch: Partial<RuntimeChartPrefs>) => void
  onClose: () => void
}

export function ProjectRuntimeMetricFullscreen({
  open,
  metric,
  title,
  metrics,
  prefs,
  onPrefsChange,
  onClose,
}: FullscreenProps) {
  const { t } = useLocale()
  const theme = useChartTheme()
  const accentPalette = useAccentPalette()
  const seriesData = metrics[metric]
  const peak = useMemo(() => peakAcrossSeries(seriesData), [seriesData])
  const latest = useMemo(() => latestAcrossSeries(seriesData), [seriesData])

  const option = useMemo(
    () => buildRuntimeChartOption(theme, metric, metrics, 'expanded', prefs, t),
    [metric, metrics, prefs, t, theme],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <Box className="project-runtime-fullscreen" role="dialog" aria-modal="true" aria-label={title}>
      <Box className="project-runtime-fullscreen__backdrop" onClick={onClose} aria-hidden />

      <Box className="project-runtime-fullscreen__panel">
        <HStack className="project-runtime-fullscreen__header" justify="space-between" gap={3}>
          <VStack align="stretch" gap={1} minW={0}>
            <HStack gap={2} flexWrap="wrap">
              <Text fontWeight="semibold" fontSize="lg">
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
            <HStack gap={4} fontSize="sm" color="fg.muted" flexWrap="wrap">
              <Text>
                {t('projects.runtime.peak')}:{' '}
                <Text as="span" color="fg" fontWeight="medium" fontFamily="mono">
                  {formatMetricSnapshot(metric, peak)}
                </Text>
              </Text>
              <Text>
                {t('projects.runtime.now')}:{' '}
                <Text as="span" color="fg" fontWeight="medium" fontFamily="mono">
                  {formatMetricSnapshot(metric, latest)}
                </Text>
              </Text>
            </HStack>
          </VStack>

          <HStack gap={1} flexShrink={0}>
            <Button
              size="xs"
              variant={prefs.fillArea ? 'subtle' : 'outline'}
              colorPalette={prefs.fillArea ? accentPalette : undefined}
              onClick={() => onPrefsChange({ fillArea: !prefs.fillArea })}
            >
              <Layers size={14} />
              {t('projects.runtime.toggleFill')}
            </Button>
            <Button
              size="xs"
              variant={prefs.autoScale ? 'subtle' : 'outline'}
              colorPalette={prefs.autoScale ? accentPalette : undefined}
              onClick={() => onPrefsChange({ autoScale: !prefs.autoScale })}
            >
              <Maximize2 size={14} />
              {t('projects.runtime.toggleAutoScale')}
            </Button>
            <IconButton
              aria-label={t('projects.runtime.closeExpand')}
              size="sm"
              variant="ghost"
              onClick={onClose}
            >
              <X size={18} />
            </IconButton>
          </HStack>
        </HStack>

        <Box className="project-runtime-fullscreen__chart">
          <EChart option={option} height={EXPANDED_HEIGHT} className="project-runtime-chart" />
        </Box>

        <Text
          className="project-observe-footnote"
          px={4}
          py={3}
          borderTopWidth="1px"
          borderColor="border.subtle"
        >
          {t('projects.runtime.expandHint')}
        </Text>
      </Box>
    </Box>,
    document.body,
  )
}

export function initialRuntimeChartPrefs(metric: RuntimeMetricId): RuntimeChartPrefs {
  return { fillArea: defaultFillArea(metric), autoScale: false }
}
