import { Badge, Box, HStack, Text } from '@chakra-ui/react'
import { Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { projectPath } from '../../routes/route-config'
import { StatusBadge } from '../ui/StatusBadge'
import { ProjectCanvasSurface } from './ProjectCanvasSurface'
import { ProjectNodeSampleList } from './ProjectNodeSampleList'
import type { ProjectSummary } from './project-sample-data'
import {
  formatProjectUpdatedAt,
  projectEnvLabelKey,
  projectHealthLabelKey,
  projectHealthTone,
} from './project-status-utils'

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()

  return (
    <Link
      to={projectPath(project.id)}
      style={{ textDecoration: 'none', display: 'block', height: '100%' }}
    >
      <Box
        display="flex"
        flexDirection="column"
        h="full"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-panel)"
        bg="bg.elevated"
        overflow="hidden"
        transition="border-color var(--motion-duration), box-shadow var(--motion-duration)"
        _hover={{ borderColor: 'border.default', boxShadow: 'sm' }}
      >
        <Box p={4} flex={1}>
          <HStack justify="space-between" align="start" gap={3} mb={3}>
            <HStack align="start" gap={3} minW={0}>
              <Box
                p={2}
                borderRadius="var(--radius-card)"
                colorPalette={accentPalette}
                bg="colorPalette.subtle"
                color="colorPalette.fg"
                flexShrink={0}
                aria-hidden
              >
                <Workflow size={18} strokeWidth={2} />
              </Box>
              <Box minW={0}>
                <Text fontWeight="semibold" lineClamp={1}>
                  {project.name}
                </Text>
                <Text fontSize="xs" color="fg.muted" lineClamp={1} mt={0.5}>
                  {t(projectEnvLabelKey(project.environment))}
                </Text>
              </Box>
            </HStack>
            <StatusBadge
              status={projectHealthTone(project.servicesOnline, project.servicesTotal)}
              label={t(projectHealthLabelKey(project.servicesOnline, project.servicesTotal))}
            />
          </HStack>

          <ProjectCanvasSurface
            py={3}
            px={2}
            minH="88px"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <ProjectNodeSampleList nodes={project.previewNodes} />
          </ProjectCanvasSurface>
        </Box>

        <HStack
          px={4}
          py={3}
          borderTopWidth="1px"
          borderColor="border.subtle"
          bg="bg.panelHover"
          justify="space-between"
          gap={2}
          flexWrap="wrap"
        >
          <Badge size="sm" variant="outline" textTransform="none">
            {t('projects.servicesShort', {
              online: String(project.servicesOnline),
              total: String(project.servicesTotal),
            })}
          </Badge>
          <Text fontSize="xs" color="fg.subtle" whiteSpace="nowrap">
            {formatProjectUpdatedAt(project.updatedAt)}
          </Text>
        </HStack>
      </Box>
    </Link>
  )
}
