import {
  Badge,
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Table,
  Text,
} from '@chakra-ui/react'
import { ArrowUp, Download, FileText, Pause, Play, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChartTheme } from '../../hooks/use-chart-theme'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { notifySuccess } from '../../lib/toast'
import { EChart } from '../charts/EChart'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import { ProjectObservabilityHeader } from './ProjectObservabilityHeader'
import {
  countLogSeverity,
  formatLogPayload,
  logSeverityLabelKey,
} from './project-observability-utils'
import { logHistogramOption } from './project-logs-chart'
import {
  buildLogHistogram,
  buildProjectLogs,
  filterLogsByHistogramBrush,
  filterLogsByQuery,
  filterLogsByRange,
  formatHistogramBrushLabel,
  formatProjectLogTime,
  type LogHistogramBrush,
  type LogTimeRangeId,
  type ProjectLogEntry,
} from './project-logs-sample'

const HISTOGRAM_HEIGHT = '118px'

export function ProjectLogsPanel() {
  const { t } = useLocale()
  const theme = useChartTheme()
  const accentPalette = useAccentPalette()
  const { project } = useProjectWorkspace()
  const scrollRef = useRef<HTMLDivElement>(null)

  const bundle = useMemo(() => buildProjectLogs(project), [project])
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<LogTimeRangeId>('15m')
  const [paused, setPaused] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [brush, setBrush] = useState<LogHistogramBrush | null>(null)
  const [brushPercent, setBrushPercent] = useState({ start: 0, end: 100 })

  useEffect(() => {
    setBrush(null)
    setBrushPercent({ start: 0, end: 100 })
  }, [range])

  const rangedEntries = useMemo(
    () => filterLogsByRange(bundle.entries, range),
    [bundle.entries, range],
  )

  const histogram = useMemo(() => buildLogHistogram(rangedEntries, range), [rangedEntries, range])

  const brushFiltered = useMemo(() => {
    if (!brush || histogram.length === 0) return rangedEntries
    return filterLogsByHistogramBrush(rangedEntries, histogram, brush)
  }, [brush, histogram, rangedEntries])

  const filtered = useMemo(() => filterLogsByQuery(brushFiltered, query), [brushFiltered, query])

  const errorCount = useMemo(() => countLogSeverity(filtered, 'error'), [filtered])
  const infoCount = filtered.length - errorCount

  const brushLabel = useMemo(() => {
    if (!brush) return null
    return formatHistogramBrushLabel(histogram, brush)
  }, [brush, histogram])

  const histogramOption = useMemo(
    () =>
      logHistogramOption(theme, {
        labels: histogram.map((b) => b.label),
        info: histogram.map((b) => b.info),
        errors: histogram.map((b) => b.error),
        brushStart: brushPercent.start,
        brushEnd: brushPercent.end,
      }),
    [brushPercent.end, brushPercent.start, histogram, theme],
  )

  const clearBrush = useCallback(() => {
    setBrush(null)
    setBrushPercent({ start: 0, end: 100 })
  }, [])

  const onChartZoom = useCallback(
    (next: { startIndex: number; endIndex: number; startPercent: number; endPercent: number }) => {
      setBrushPercent({ start: next.startPercent, end: next.endPercent })
      const isFull = next.startPercent <= 0.5 && next.endPercent >= 99.5 && next.startIndex <= 0
      if (isFull) {
        setBrush(null)
        return
      }
      setBrush({ startIndex: next.startIndex, endIndex: next.endIndex })
    },
    [],
  )

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowScrollTop(el.scrollTop > 240)
  }, [])

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <Box className="project-logs-panel" flex={1} minH={0} display="flex" flexDirection="column">
      <ProjectObservabilityHeader
        title={t('projects.logs.title')}
        description={t('projects.logs.subtitle')}
        icon={<FileText size={20} strokeWidth={1.75} />}
        stats={[
          { label: t('projects.logs.statLines'), value: String(filtered.length), tone: 'accent' },
          {
            label: t('projects.logs.statErrors'),
            value: String(errorCount),
            tone: errorCount > 0 ? 'danger' : 'default',
          },
          { label: t('projects.logs.statServices'), value: String(project.servicesTotal) },
        ]}
      />

      <Box
        className="project-observe-body project-logs-body"
        flex={1}
        minH={0}
        display="flex"
        flexDirection="column"
        px={{ base: 3, md: 4 }}
        pb={3}
      >
        <Box className="project-observe-surface project-logs-toolbar-card" mb={3}>
          <HStack gap={2} flexWrap={{ base: 'wrap', lg: 'nowrap' }} p={3}>
            <HStack className="project-logs-search" flex={{ base: '1 1 100%', lg: 1 }} minW={0}>
              <Search size={15} strokeWidth={2} color="var(--chakra-colors-fg-muted)" />
              <Input
                size="sm"
                variant="flushed"
                border="none"
                flex={1}
                placeholder={t('projects.logs.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </HStack>

            <NativeSelect.Root size="sm" width={{ base: 'full', sm: '9.5rem' }} flexShrink={0}>
              <NativeSelect.Field
                value={range}
                onChange={(e) => setRange(e.target.value as LogTimeRangeId)}
              >
                <option value="15m">{t('projects.logs.range15m')}</option>
                <option value="1h">{t('projects.logs.range1h')}</option>
                <option value="24h">{t('projects.logs.range24h')}</option>
              </NativeSelect.Field>
            </NativeSelect.Root>

            <HStack gap={1} flexShrink={0}>
              <Button
                size="sm"
                variant={paused ? 'subtle' : 'outline'}
                colorPalette={paused ? accentPalette : undefined}
                onClick={() => setPaused((v) => !v)}
              >
                {paused ? <Play size={15} /> : <Pause size={15} />}
                <Box as="span" display={{ base: 'none', md: 'inline' }} ml={1}>
                  {paused ? t('projects.logs.resume') : t('projects.logs.pause')}
                </Box>
              </Button>
              <IconButton
                aria-label={t('projects.logs.download')}
                size="sm"
                variant="outline"
                onClick={() => notifySuccess(t('projects.logs.exportQueued'))}
              >
                <Download size={16} />
              </IconButton>
            </HStack>
          </HStack>

          <Box className="project-logs-histogram" px={3} pb={3}>
            <HStack justify="space-between" mb={2} px={0.5} flexWrap="wrap" gap={2}>
              <HStack gap={2} flexWrap="wrap" minW={0}>
                <Text fontSize="xs" fontWeight="medium" color="fg.muted">
                  {t('projects.logs.volumeTitle')}
                </Text>
                {brush && brushLabel ? (
                  <Badge
                    size="sm"
                    variant="subtle"
                    colorPalette={accentPalette}
                    textTransform="none"
                  >
                    <HStack gap={1}>
                      <Text>{t('projects.logs.chartFilter', { range: brushLabel })}</Text>
                      <IconButton
                        aria-label={t('projects.logs.clearChartFilter')}
                        size="2xs"
                        variant="ghost"
                        minW={0}
                        h="auto"
                        p={0}
                        onClick={clearBrush}
                      >
                        <X size={12} />
                      </IconButton>
                    </HStack>
                  </Badge>
                ) : (
                  <Text fontSize="2xs" color="fg.subtle">
                    {t('projects.logs.brushHint')}
                  </Text>
                )}
              </HStack>
              <HStack gap={3} fontSize="2xs" color="fg.muted" flexShrink={0}>
                <HStack gap={1}>
                  <Box className="project-logs-legend-dot project-logs-legend-dot--info" />
                  {t('projects.logs.legendInfo')} ({infoCount})
                </HStack>
                <HStack gap={1}>
                  <Box className="project-logs-legend-dot project-logs-legend-dot--error" />
                  {t('projects.logs.legendError')} ({errorCount})
                </HStack>
              </HStack>
            </HStack>

            <Box className="project-logs-chart-brush-host">
              <EChart
                option={histogramOption}
                height={HISTOGRAM_HEIGHT}
                className="project-logs-chart"
                onDataZoom={onChartZoom}
              />
            </Box>
            {paused ? (
              <Text fontSize="2xs" color="fg.muted" mt={1}>
                {t('projects.logs.pausedHint')}
              </Text>
            ) : null}
          </Box>
        </Box>

        <Box
          className="project-observe-surface project-logs-table-wrap"
          flex={1}
          minH={0}
          position="relative"
        >
          <Box
            ref={scrollRef}
            className="project-logs-table-scroll app-scroll"
            h="100%"
            overflow="auto"
            onScroll={onScroll}
          >
            <Table.Root size="sm" variant="line" stickyHeader className="project-logs-table">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader w="6.5rem">
                    {t('projects.logs.colSeverity')}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="10.5rem" whiteSpace="nowrap">
                    {t('projects.logs.colTime', { tz: bundle.timezoneLabel })}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="7.5rem">
                    {t('projects.logs.colService')}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>{t('projects.logs.colData')}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filtered.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={4} py={10} textAlign="center">
                      <Text color="fg.muted" fontSize="sm">
                        {t('projects.logs.empty')}
                      </Text>
                      <Text color="fg.subtle" fontSize="xs" mt={1}>
                        {brush ? t('projects.logs.emptyBrush') : t('projects.logs.emptyHint')}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filtered.map((row) => <LogRow key={row.id} row={row} />)
                )}
              </Table.Body>
            </Table.Root>
          </Box>

          {showScrollTop ? (
            <IconButton
              className="project-logs-scroll-top"
              aria-label={t('projects.logs.scrollTop')}
              size="sm"
              variant="solid"
              colorPalette="gray"
              position="absolute"
              bottom={3}
              right={3}
              shadow="md"
              onClick={scrollToTop}
            >
              <ArrowUp size={16} />
            </IconButton>
          ) : null}
        </Box>

        <Text className="project-observe-footnote" mt={2} px={0.5}>
          {t('projects.logs.footerCount', { count: String(filtered.length) })} ·{' '}
          {t('projects.logs.previewNote')}
        </Text>
      </Box>
    </Box>
  )
}

function LogRow({ row }: { row: ProjectLogEntry }) {
  const { t } = useLocale()
  const isError = row.severity === 'error'
  const isWarn = row.severity === 'warn'
  const message = formatLogPayload(row.data)

  return (
    <Table.Row
      className={
        isError ? 'project-logs-row--error' : isWarn ? 'project-logs-row--warn' : undefined
      }
      verticalAlign="top"
    >
      <Table.Cell py={2}>
        <Badge
          size="sm"
          variant="subtle"
          colorPalette={isError ? 'red' : isWarn ? 'orange' : 'blue'}
          textTransform="none"
        >
          {t(logSeverityLabelKey(row.severity))}
        </Badge>
      </Table.Cell>
      <Table.Cell fontSize="xs" color="fg.muted" whiteSpace="nowrap" fontFamily="mono" py={2}>
        {formatProjectLogTime(row.at)}
      </Table.Cell>
      <Table.Cell py={2}>
        <Badge
          size="sm"
          variant="outline"
          colorPalette="gray"
          fontFamily="mono"
          textTransform="none"
        >
          {row.service}
        </Badge>
      </Table.Cell>
      <Table.Cell fontSize="xs" fontFamily="mono" maxW={0} py={2}>
        <Text lineClamp={2} wordBreak="break-word" title={row.data}>
          {message}
        </Text>
      </Table.Cell>
    </Table.Row>
  )
}
