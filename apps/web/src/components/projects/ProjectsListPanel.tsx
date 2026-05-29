import { Box, Grid, HStack, Text, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../hooks/use-locale'
import { projectPath } from '../../routes/route-config'
import { DataListEmpty } from '../ui/DataList'
import { ProjectCard } from './ProjectCard'
import type { ProjectDetail } from './project-sample-data'
import { ProjectsToolbar, type ProjectsSort, type ProjectsViewMode } from './ProjectsToolbar'

function sortProjects(items: ProjectDetail[], sort: ProjectsSort): ProjectDetail[] {
  const copy = [...items]
  if (sort === 'name') {
    return copy.sort((a, b) => a.name.localeCompare(b.name))
  }
  if (sort === 'status') {
    return copy.sort((a, b) => {
      const ra = a.servicesTotal ? a.servicesOnline / a.servicesTotal : 0
      const rb = b.servicesTotal ? b.servicesOnline / b.servicesTotal : 0
      return rb - ra
    })
  }
  return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function ProjectsListPanel({ projects }: { projects: ProjectDetail[] }) {
  const { t } = useLocale()
  const [sort, setSort] = useState<ProjectsSort>('recent')
  const [viewMode, setViewMode] = useState<ProjectsViewMode>('grid')

  const sorted = useMemo(() => sortProjects(projects, sort), [projects, sort])

  return (
    <>
      <ProjectsToolbar
        count={projects.length}
        sort={sort}
        viewMode={viewMode}
        onSortChange={setSort}
        onViewModeChange={setViewMode}
      />

      {!projects.length ? (
        <DataListEmpty>{t('projects.empty')}</DataListEmpty>
      ) : viewMode === 'grid' ? (
        <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr', xl: '1fr 1fr 1fr 1fr' }} gap={4}>
          {sorted.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </Grid>
      ) : (
        <VStack align="stretch" gap={2}>
          {sorted.map((project) => (
            <ProjectListRow key={project.id} project={project} />
          ))}
        </VStack>
      )}
    </>
  )
}

function ProjectListRow({ project }: { project: ProjectDetail }) {
  const { t } = useLocale()
  const ratio = project.servicesTotal > 0 ? project.servicesOnline / project.servicesTotal : 0

  return (
    <Link to={projectPath(project.id)} style={{ textDecoration: 'none' }}>
      <HStack
        px={4}
        py={3}
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-input)"
        bg="bg.elevated"
        justify="space-between"
        _hover={{ borderColor: 'border.emphasized', bg: 'bg.panelHover' }}
      >
        <Box minW={0}>
          <Text fontWeight="semibold" fontSize="sm">
            {project.name}
          </Text>
          <Text fontSize="xs" color="fg.muted" mt={0.5}>
            {project.environment} ·{' '}
            {t('projects.servicesShort', {
              online: String(project.servicesOnline),
              total: String(project.servicesTotal),
            })}
          </Text>
        </Box>
        <Text fontSize="xs" color={ratio >= 1 ? 'green.300' : 'orange.300'}>
          {Math.round(ratio * 100)}%
        </Text>
      </HStack>
    </Link>
  )
}
