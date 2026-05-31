import { Box, Grid, HStack, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { DataListEmpty } from '../ui/DataList'
import { SectionCard } from '../ui/Section'
import { ShimmerBlock, ShimmerSurface } from '../ui/Shimmer'
import { ProjectCard } from './ProjectCard'
import { ProjectListRow } from './ProjectListRow'
import type { ProjectPresenceByProject } from '../../lib/api/project-collaboration'
import type { ProjectDetail } from './project-sample-data'
import { ProjectsToolbar, type ProjectsSort, type ProjectsViewMode } from './ProjectsToolbar'

const GRID_COLUMNS = { base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' } as const
const SKELETON_CARD_COUNT = 6
const SKELETON_ROW_COUNT = 5

function ProjectsToolbarSkeleton() {
  return (
    <HStack
      justify="space-between"
      align="center"
      flexWrap="wrap"
      gap={3}
      px={{ base: 3, md: 4 }}
      py={3}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      bg="bg.panelHover"
      aria-hidden
    >
      <HStack gap={2} minW={0}>
        <ShimmerBlock w="18px" h="18px" radius="sm" />
        <ShimmerBlock w="96px" h="14px" radius="sm" />
      </HStack>
      <HStack gap={2} flexWrap="wrap" justify="flex-end">
        <ShimmerBlock
          w="160px"
          h="2rem"
          radius="var(--radius-input)"
          display={{ base: 'none', sm: 'block' }}
        />
        <ShimmerBlock
          w="140px"
          h="2rem"
          radius="var(--radius-input)"
          display={{ base: 'block', sm: 'none' }}
        />
        <HStack gap={1}>
          <ShimmerBlock w="2rem" h="2rem" radius="var(--radius-input)" />
          <ShimmerBlock w="2rem" h="2rem" radius="var(--radius-input)" />
        </HStack>
      </HStack>
    </HStack>
  )
}

function ProjectCardSkeleton({ index }: { index: number }) {
  const titleW = `${112 + (index % 3) * 24}px`
  return (
    <ShimmerSurface
      display="flex"
      flexDirection="column"
      h="full"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-panel)"
      bg="bg.elevated"
      overflow="hidden"
      aria-hidden
    >
      <Box p={4} flex={1}>
        <HStack justify="space-between" align="start" gap={3} mb={3}>
          <HStack align="start" gap={3} minW={0} flex={1}>
            <ShimmerBlock w="34px" h="34px" radius="var(--radius-card)" flexShrink={0} />
            <Box flex={1} minW={0}>
              <ShimmerBlock w={titleW} h="15px" radius="sm" maxW="full" />
              <ShimmerBlock w="72px" h="11px" radius="sm" mt={1.5} />
            </Box>
          </HStack>
          <ShimmerBlock w="58px" h="22px" radius="full" flexShrink={0} />
        </HStack>

        <ShimmerSurface
          minH="88px"
          borderRadius="var(--radius-card)"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.subtle"
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={2}
          px={3}
        >
          {Array.from({ length: 3 + (index % 2) }).map((_, dot) => (
            <ShimmerBlock
              key={dot}
              w={`${28 + dot * 8}px`}
              h="22px"
              radius="full"
              opacity={0.85 - dot * 0.08}
            />
          ))}
        </ShimmerSurface>
      </Box>

      <HStack
        px={4}
        py={3}
        borderTopWidth="1px"
        borderColor="border.subtle"
        bg="bg.panelHover"
        justify="space-between"
        gap={2}
      >
        <ShimmerBlock w="88px" h="22px" radius="full" />
        <ShimmerBlock w="64px" h="11px" radius="sm" />
      </HStack>
    </ShimmerSurface>
  )
}

function ProjectListRowSkeleton({ index, last }: { index: number; last?: boolean }) {
  return (
    <ShimmerSurface aria-hidden borderBottomWidth={last ? 0 : '1px'} borderColor="border.subtle">
      <HStack
        align="center"
        gap={{ base: 3, md: 4 }}
        px={{ base: 3, md: 4 }}
        py={3}
        flexWrap={{ base: 'wrap', lg: 'nowrap' }}
      >
        <ShimmerBlock w="34px" h="34px" radius="var(--radius-card)" flexShrink={0} />
        <Box flex={{ base: '1 1 100%', md: '1 1 12rem' }} minW={0}>
          <ShimmerBlock w={`${120 + (index % 2) * 32}px`} h="15px" radius="sm" maxW="full" />
          <ShimmerBlock w="80px" h="11px" radius="sm" mt={1.5} />
        </Box>
        <ShimmerSurface
          flex={{ base: '1 1 100%', lg: 1 }}
          minH="56px"
          minW={{ md: '12rem' }}
          borderRadius="var(--radius-card)"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.subtle"
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={2}
          px={2}
        >
          {Array.from({ length: 4 }).map((_, dot) => (
            <ShimmerBlock key={dot} w="24px" h="18px" radius="full" />
          ))}
        </ShimmerSurface>
        <ShimmerBlock
          w="18px"
          h="18px"
          radius="sm"
          flexShrink={0}
          display={{ base: 'none', sm: 'block' }}
        />
      </HStack>
      <HStack px={{ base: 3, md: 4 }} pb={3} pt={0} gap={3} flexWrap="wrap">
        <ShimmerBlock w="72px" h="20px" radius="full" />
        <ShimmerBlock w="96px" h="11px" radius="sm" />
      </HStack>
    </ShimmerSurface>
  )
}

export function ProjectsListPanelSkeleton({ viewMode = 'grid' }: { viewMode?: ProjectsViewMode }) {
  const { t } = useLocale()

  return (
    <SectionCard
      p={0}
      mt={4}
      overflow="hidden"
      aria-busy="true"
      aria-label={t('projects.loading')}
      className="projects-list-skeleton"
    >
      <ProjectsToolbarSkeleton />
      {viewMode === 'grid' ? (
        <Box p={{ base: 3, md: 4 }}>
          <Grid templateColumns={GRID_COLUMNS} gap={3}>
            {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
              <ProjectCardSkeleton key={index} index={index} />
            ))}
          </Grid>
        </Box>
      ) : (
        <VStack align="stretch" gap={0}>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <ProjectListRowSkeleton
              key={index}
              index={index}
              last={index === SKELETON_ROW_COUNT - 1}
            />
          ))}
        </VStack>
      )}
    </SectionCard>
  )
}

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

export function ProjectsListPanel({
  projects,
  presenceByProject,
  isLoading = false,
}: {
  projects: ProjectDetail[]
  presenceByProject?: ProjectPresenceByProject
  isLoading?: boolean
}) {
  const { t } = useLocale()
  const [sort, setSort] = useState<ProjectsSort>('recent')
  const [viewMode, setViewMode] = useState<ProjectsViewMode>('grid')

  const sorted = useMemo(() => sortProjects(projects, sort), [projects, sort])

  if (isLoading) {
    return <ProjectsListPanelSkeleton viewMode={viewMode} />
  }

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
          <Grid templateColumns={GRID_COLUMNS} gap={3}>
            {sorted.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                guests={presenceByProject?.get(project.id) ?? []}
              />
            ))}
          </Grid>
        </Box>
      ) : (
        <Box>
          {sorted.map((project) => (
            <ProjectListRow
              key={project.id}
              project={project}
              guests={presenceByProject?.get(project.id) ?? []}
            />
          ))}
        </Box>
      )}
    </SectionCard>
  )
}
