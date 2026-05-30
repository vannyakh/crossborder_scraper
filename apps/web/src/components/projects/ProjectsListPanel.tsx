import { Box, Grid } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { DataListEmpty } from '../ui/DataList'
import { SectionCard } from '../ui/Section'
import { ProjectCard } from './ProjectCard'
import { ProjectListRow } from './ProjectListRow'
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
    <SectionCard p={0} mt={4} overflow="hidden">
      <ProjectsToolbar
        count={projects.length}
        sort={sort}
        viewMode={viewMode}
        onSortChange={setSort}
        onViewModeChange={setViewMode}
      />

      {!projects.length ? (
        <Box p={{ base: 4, md: 6 }}>
          <DataListEmpty>{t('projects.empty')}</DataListEmpty>
        </Box>
      ) : viewMode === 'grid' ? (
        <Box p={{ base: 3, md: 4 }}>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }} gap={3}>
            {sorted.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </Grid>
        </Box>
      ) : (
        <Box>
          {sorted.map((project) => (
            <ProjectListRow key={project.id} project={project} />
          ))}
        </Box>
      )}
    </SectionCard>
  )
}
