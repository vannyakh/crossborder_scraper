import { Badge, Box, Button, Grid, HStack, Text, VStack } from '@chakra-ui/react'
import { Activity, Cpu, HardDrive, MemoryStick, Pause, Play, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjectRuntimeQuery } from '../../hooks/queries/use-project-runtime-query'
import { useLocale } from '../../hooks/use-locale'
import { queryKeys, type ProjectRuntimeRecentLog, type ProjectRuntimeState } from '../../lib/api'
import { formatSamplePeriod } from '../dashboard/chart-utils'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import { ProjectObservabilityHeader } from './ProjectObservabilityHeader'
import { ProjectRuntimePanelSkeleton } from './project-observe-skeletons'
import { ProjectRuntimeMetricCard } from './ProjectRuntimeMetricCard'
import {
  mapProjectRuntimeMetrics,
  type ProjectRuntimeMetrics,
  type RuntimeMetricId,
} from './project-runtime-metrics'

const METRIC_ORDER: RuntimeMetricId[] = ['cpu', 'memory', 'network', 'disk']

const EMPTY_METRICS: ProjectRuntimeMetrics = {
  labels: [],
  cpu: [],
  memory: [],
  network: [],
  disk: [],
}

function hostStatTone(percent: number): 'default' | 'success' | 'danger' {
  if (percent >= 85) return 'danger'
  if (percent >= 60) return 'default'
  return 'success'
}

function logLevelPalette(level: string): string {
  if (level === 'error') return 'red'
  if (level === 'warn') return 'orange'
  if (level === 'success') return 'green'
  if (level === 'debug') return 'gray'
  return 'blue'
}

function formatRecentLogTime(iso: string): string {
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return iso
  return new Date(at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ProjectRuntimePanel() {
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const { project } = useProjectWorkspace()
  const [paused, setPaused] = useState(false)

  const { data, isLoading, isError, isFetching, refetch } = useProjectRuntimeQuery({
    projectId: project.id,
    paused,
  })

  const metrics = data?.metrics ? mapProjectRuntimeMetrics(data.metrics) : EMPTY_METRICS

  const state = data?.state
  const recentLogs = data?.recent_logs ?? []

  let periodLabel = '—'
  if (state?.collected_at) {
    const end = Date.parse(state.collected_at)
    if (!Number.isNaN(end) && metrics.labels.length > 0) {
      const start = end - (metrics.labels.length - 1) * 5 * 60 * 1000
      periodLabel = formatSamplePeriod([{ t: start }, { t: end }])
    }
  } else if (metrics.labels.length > 0) {
    periodLabel = `${metrics.labels[0]} – ${metrics.labels[metrics.labels.length - 1]}`
  }

  const titleKeys: Record<RuntimeMetricId, string> = {
    cpu: 'projects.runtime.cpu',
    memory: 'projects.runtime.memory',
    network: 'projects.runtime.network',
    disk: 'projects.runtime.disk',
  }

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.projectRuntime(project.id) })
    void refetch()
  }

  const simulated = Boolean(data?.simulated)
  const live = Boolean(data?.live) && !isError && !simulated

  if (isLoading) {
    return <ProjectRuntimePanelSkeleton label={t('projects.runtime.loading')} />
  }

  return (
    <Box className="project-runtime-panel" flex={1} minH={0} overflow="auto">
      <ProjectObservabilityHeader
        title={t('projects.runtime.title')}
        description={t('projects.runtime.subtitle', { period: periodLabel })}
        icon={<Activity size={20} strokeWidth={1.75} />}
        live={live}
        simulated={simulated}
        stats={[
          {
            label: t('projects.runtime.statServices'),
            value: state
              ? `${state.services_online}/${state.services_total}`
              : `${project.servicesOnline}/${project.servicesTotal}`,
            tone: 'success',
          },
          {
            label: t('projects.runtime.statNodes'),
            value: String(state?.nodes ?? project.nodes.length),
          },
          {
            label: t('projects.runtime.statHostCpu'),
            value: state ? `${Math.round(state.host_cpu_percent)}%` : '—',
            tone: state ? hostStatTone(state.host_cpu_percent) : 'default',
          },
        ]}
        actions={
          <HStack gap={1}>
            <Button
              size="sm"
              variant={paused ? 'subtle' : 'outline'}
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? <Play size={15} /> : <Pause size={15} />}
              <Box as="span" display={{ base: 'none', md: 'inline' }} ml={1}>
                {paused ? t('projects.runtime.resume') : t('projects.runtime.pause')}
              </Box>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={refresh}
              loading={isFetching && !isLoading}
            >
              <RefreshCw size={15} />
              <Box as="span" display={{ base: 'none', md: 'inline' }} ml={1}>
                {t('projects.runtime.refresh')}
              </Box>
            </Button>
          </HStack>
        }
      />

      <Box className="project-observe-body" px={{ base: 3, md: 4 }} pb={{ base: 4, md: 5 }}>
        {state ? <ProjectRuntimeHostState state={state} t={t} /> : null}

        {isError ? (
          <Box py={10} textAlign="center">
            <Text color="red.300" fontSize="sm">
              {t('projects.runtime.loadFailed')}
            </Text>
          </Box>
        ) : (
          <Grid
            className="project-runtime-grid"
            templateColumns={{ base: '1fr', xl: '1fr 1fr' }}
            gap={{ base: 3, md: 4 }}
            mt={3}
          >
            {METRIC_ORDER.map((metric) => (
              <ProjectRuntimeMetricCard
                key={metric}
                metric={metric}
                title={t(titleKeys[metric])}
                metrics={metrics}
                onRefresh={refresh}
              />
            ))}
          </Grid>
        )}

        <ProjectRuntimeRecentLogs logs={recentLogs} t={t} />

        <Box className="project-observe-footnote" mt={4}>
          {live ? t('projects.runtime.footnoteLive') : t('projects.runtime.footnote')}
          {isFetching && !isLoading ? ` · ${t('projects.runtime.syncing')}` : null}
        </Box>
      </Box>
    </Box>
  )
}

function ProjectRuntimeHostState({
  state,
  t,
}: {
  state: ProjectRuntimeState
  t: (key: string, params?: Record<string, string>) => string
}) {
  const items = [
    {
      icon: Cpu,
      label: t('projects.runtime.hostCpu'),
      value: `${Math.round(state.host_cpu_percent)}%`,
      tone: hostStatTone(state.host_cpu_percent),
    },
    {
      icon: MemoryStick,
      label: t('projects.runtime.hostMemory'),
      value: `${Math.round(state.host_memory_percent)}%`,
      tone: hostStatTone(state.host_memory_percent),
    },
    {
      icon: HardDrive,
      label: t('projects.runtime.hostDisk'),
      value: `${Math.round(state.host_disk_percent)}%`,
      tone: hostStatTone(state.host_disk_percent),
    },
  ]

  return (
    <Box className="project-observe-surface project-runtime-state-card" p={3}>
      <HStack justify="space-between" flexWrap="wrap" gap={2} mb={3}>
        <Text fontSize="sm" fontWeight="semibold">
          {t('projects.runtime.stateTitle')}
        </Text>
        <Text fontSize="xs" color="fg.muted" fontFamily="mono">
          {t('projects.runtime.revision', { rev: String(state.flow_revision) })}
          {' · '}
          {formatRecentLogTime(state.collected_at)}
        </Text>
      </HStack>
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={3}>
        {items.map(({ icon: Icon, label, value, tone }) => (
          <HStack
            key={label}
            className="project-runtime-state-stat"
            gap={3}
            p={2.5}
            borderWidth="1px"
            borderColor="border.muted"
            borderRadius="md"
          >
            <Box
              color={tone === 'danger' ? 'red.400' : tone === 'success' ? 'green.400' : 'fg.muted'}
            >
              <Icon size={18} strokeWidth={1.75} />
            </Box>
            <Box minW={0}>
              <Text fontSize="2xs" color="fg.muted">
                {label}
              </Text>
              <Text fontSize="sm" fontWeight="semibold" fontFamily="mono">
                {value}
              </Text>
            </Box>
          </HStack>
        ))}
      </Grid>
    </Box>
  )
}

function ProjectRuntimeRecentLogs({
  logs,
  t,
}: {
  logs: ProjectRuntimeRecentLog[]
  t: (key: string) => string
}) {
  return (
    <Box className="project-observe-surface project-runtime-recent-logs" mt={4} p={3}>
      <Text fontSize="sm" fontWeight="semibold" mb={2}>
        {t('projects.runtime.recentLogs')}
      </Text>
      {logs.length === 0 ? (
        <Text fontSize="sm" color="fg.muted">
          {t('projects.runtime.recentLogsEmpty')}
        </Text>
      ) : (
        <VStack align="stretch" gap={1.5}>
          {logs.map((row) => (
            <HStack
              key={row.id}
              className="project-runtime-log-row"
              align="flex-start"
              gap={2}
              fontSize="xs"
              py={1}
              borderBottomWidth="1px"
              borderColor="border.muted"
              _last={{ borderBottomWidth: 0 }}
            >
              <Text color="fg.muted" fontFamily="mono" flexShrink={0} minW="4.5rem">
                {formatRecentLogTime(row.created_at)}
              </Text>
              <Badge
                size="sm"
                variant="subtle"
                colorPalette={logLevelPalette(row.level)}
                textTransform="none"
                flexShrink={0}
              >
                {row.level}
              </Badge>
              {row.node_label ? (
                <Badge
                  size="sm"
                  variant="outline"
                  colorPalette="gray"
                  textTransform="none"
                  flexShrink={0}
                >
                  {row.node_label}
                </Badge>
              ) : null}
              <Text color="fg" wordBreak="break-word" flex={1}>
                {row.message}
              </Text>
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  )
}
