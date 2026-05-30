import { Box, HStack, Text } from '@chakra-ui/react'
import { ChevronRight, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { projectPath } from '../../routes/route-config'
import { StatusBadge } from '../ui/StatusBadge'
import { ProjectCanvasSurface } from './ProjectCanvasSurface'
import { ProjectActiveGuests, buildPreviewNodeFocusColors } from './ProjectActiveGuests'
import { ProjectNodeSampleList } from './ProjectNodeSampleList'
import type { ProjectSummary } from './project-sample-data'
import type { ProjectPresenceGuest } from '../../lib/api/project-collaboration'
import {
  formatProjectUpdatedAt,
  projectEnvLabelKey,
  projectHealthLabelKey,
  projectHealthTone,
} from './project-status-utils'

export function ProjectListRow({
  project,
  guests = [],
}: {
  project: ProjectSummary
  guests?: ProjectPresenceGuest[]
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const nodeFocusColors = buildPreviewNodeFocusColors(guests)

  return (
    <Link to={projectPath(project.id)} style={{ textDecoration: 'none' }}>
      <HStack
        align="center"
        gap={{ base: 3, md: 4 }}
        px={{ base: 3, md: 4 }}
        py={3}
        borderBottomWidth="1px"
        borderColor="border.subtle"
        _last={{ borderBottomWidth: 0 }}
        _hover={{ bg: 'bg.panelHover' }}
        transition="background-color var(--motion-duration)"
      >
        <Box
          p={2}
          borderRadius="var(--radius-card)"
          colorPalette={accentPalette}
          bg="colorPalette.subtle"
          color="colorPalette.fg"
          flexShrink={0}
          aria-hidden
        >
          <Workflow size={16} strokeWidth={2} />
        </Box>

        <Box minW={0} flex={1}>
          <HStack justify="space-between" align="start" gap={2} flexWrap="wrap">
            <Box minW={0}>
              <Text fontWeight="semibold" fontSize="sm" lineClamp={1}>
                {project.name}
              </Text>
              <Text fontSize="xs" color="fg.muted" mt={0.5} lineClamp={1}>
                {t(projectEnvLabelKey(project.environment))} ·{' '}
                {t('projects.servicesShort', {
                  online: String(project.servicesOnline),
                  total: String(project.servicesTotal),
                })}
              </Text>
            </Box>
            <StatusBadge
              status={projectHealthTone(project.servicesOnline, project.servicesTotal)}
              label={t(projectHealthLabelKey(project.servicesOnline, project.servicesTotal))}
            />
            {guests.length > 0 ? <ProjectActiveGuests guests={guests} compact /> : null}
          </HStack>

          <ProjectCanvasSurface mt={2} py={2} px={2}>
            <ProjectNodeSampleList
              nodes={project.previewNodes}
              compact
              nodeFocusColors={nodeFocusColors}
            />
          </ProjectCanvasSurface>

          <Text mt={1.5} fontSize="xs" color="fg.subtle">
            {formatProjectUpdatedAt(project.updatedAt)}
          </Text>
        </Box>

        <Box color="fg.subtle" flexShrink={0} aria-hidden>
          <ChevronRight size={16} />
        </Box>
      </HStack>
    </Link>
  )
}
