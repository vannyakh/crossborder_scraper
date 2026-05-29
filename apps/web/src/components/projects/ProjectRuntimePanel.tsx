import { Box, Grid } from '@chakra-ui/react'
import { Activity } from 'lucide-react'
import { useMemo } from 'react'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import { useLocale } from '../../hooks/use-locale'
import { formatSamplePeriod } from '../dashboard/chart-utils'
import { ProjectObservabilityHeader } from './ProjectObservabilityHeader'
import { ProjectRuntimeMetricCard } from './ProjectRuntimeMetricCard'
import { buildProjectRuntimeMetrics, type RuntimeMetricId } from './project-runtime-metrics'
const METRIC_ORDER: RuntimeMetricId[] = ['cpu', 'memory', 'network', 'disk']

export function ProjectRuntimePanel() {
  const { t } = useLocale()
  const { project } = useProjectWorkspace()

  const metrics = useMemo(() => buildProjectRuntimeMetrics(project), [project])
  const periodLabel = useMemo(() => {
    const samples = metrics.labels.map((_, i) => ({
      t: Date.now() - (metrics.labels.length - 1 - i) * 5 * 60 * 1000,
    }))
    return formatSamplePeriod(samples)
  }, [metrics.labels])

  const titleKeys: Record<RuntimeMetricId, string> = {
    cpu: 'projects.runtime.cpu',
    memory: 'projects.runtime.memory',
    network: 'projects.runtime.network',
    disk: 'projects.runtime.disk',
  }

  return (
    <Box className="project-runtime-panel" flex={1} minH={0} overflow="auto">
      <ProjectObservabilityHeader
        title={t('projects.runtime.title')}
        description={t('projects.runtime.subtitle', { period: periodLabel })}
        icon={<Activity size={20} strokeWidth={1.75} />}
        stats={[
          {
            label: t('projects.runtime.statServices'),
            value: `${project.servicesOnline}/${project.servicesTotal}`,
            tone: 'success',
          },
          {
            label: t('projects.runtime.statNodes'),
            value: String(project.nodes.length),
          },
          {
            label: t('projects.runtime.statWindow'),
            value: periodLabel,
            tone: 'accent',
          },
        ]}
      />

      <Box className="project-observe-body" px={{ base: 3, md: 4 }} pb={{ base: 4, md: 5 }}>
        <Grid
          className="project-runtime-grid"
          templateColumns={{ base: '1fr', xl: '1fr 1fr' }}
          gap={{ base: 3, md: 4 }}
        >
          {METRIC_ORDER.map((metric) => (
            <ProjectRuntimeMetricCard
              key={metric}
              metric={metric}
              title={t(titleKeys[metric])}
              metrics={metrics}
            />
          ))}
        </Grid>

        <Box className="project-observe-footnote" mt={4}>
          {t('projects.runtime.footnote')}
        </Box>
      </Box>
    </Box>
  )
}
