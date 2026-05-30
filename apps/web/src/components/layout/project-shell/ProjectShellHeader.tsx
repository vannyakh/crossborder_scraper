import { Badge, Box, HStack, Separator, Text } from '@chakra-ui/react'
import { useNavigate, useParams } from 'react-router-dom'
import { ProjectCollaborators } from '../../projects/ProjectCollaborators'
import { isProjectSectionId } from '../../projects/project-sections'
import type { ProjectEnvironment } from '../../projects/project-sample-data'
import { useLocale } from '../../../hooks/use-locale'
import { ROUTE_PATHS } from '../../../routes/route-config'
import { ShellHeaderRow, ShellLogoMark } from '../ShellChrome'
import { useProjectWorkspace } from './project-workspace-context'

const ENV_BADGE: Record<
  ProjectEnvironment,
  { labelKey: string; colorPalette: 'green' | 'orange' | 'gray' }
> = {
  production: { labelKey: 'projects.envProduction', colorPalette: 'green' },
  staging: { labelKey: 'projects.envStaging', colorPalette: 'orange' },
  development: { labelKey: 'projects.envDevelopment', colorPalette: 'gray' },
}

export function ProjectShellHeader() {
  const { section } = useParams<{ section?: string }>()
  const { t } = useLocale()
  const navigate = useNavigate()
  const { project, running } = useProjectWorkspace()
  const showFlowMeta = !section || section === 'flow' || !isProjectSectionId(section)
  const env = ENV_BADGE[project.environment]

  const servicesLabel = t('projects.servicesOnline', {
    online: String(project.servicesOnline),
    total: String(project.servicesTotal),
  })
  const servicesShort = t('projects.servicesShort', {
    online: String(project.servicesOnline),
    total: String(project.servicesTotal),
  })

  return (
    <ShellHeaderRow
      className="project-shell-header"
      w="full"
      flexShrink={0}
      justify="space-between"
      flexWrap="nowrap"
      gap={3}
      bg="bg.navbar"
    >
      <HStack className="project-shell-header__start" gap={2.5} minW={0} flex="1 1 auto">
        <ShellLogoMark
          collapsed
          layout="header"
          label="Cross-Border"
          onClick={() => navigate(ROUTE_PATHS.projects.base)}
          buttonTitle={t('projects.backToList')}
        />

        <Separator
          orientation="vertical"
          height="5"
          borderColor="border.subtle"
          display={{ base: 'none', sm: 'block' }}
        />

        <Box className="project-shell-header__title" minW={0}>
          <HStack gap={2} minW={0}>
            <Text
              as="h1"
              fontWeight="semibold"
              fontSize="md"
              lineHeight="1.2"
              truncate
              title={project.name}
            >
              {project.name}
            </Text>
            <Badge
              size="sm"
              variant="subtle"
              colorPalette={env.colorPalette}
              flexShrink={0}
              textTransform="none"
              fontWeight="medium"
            >
              {t(env.labelKey)}
            </Badge>
          </HStack>
        </Box>
      </HStack>

      {showFlowMeta ? (
        <HStack className="project-shell-header__actions" gap={2} flexShrink={0}>
          <ProjectCollaborators />
          {running ? (
            <Badge
              size="sm"
              variant="subtle"
              colorPalette="green"
              textTransform="none"
              fontWeight="medium"
            >
              {t('projects.flowRunning')}
            </Badge>
          ) : null}
          <Text
            fontSize="xs"
            color="fg.muted"
            whiteSpace="nowrap"
            display={{ base: 'none', lg: 'block' }}
          >
            {servicesLabel}
          </Text>
          <Text
            fontSize="xs"
            color="fg.muted"
            whiteSpace="nowrap"
            display={{ base: 'none', sm: 'block', lg: 'none' }}
          >
            {servicesShort}
          </Text>
        </HStack>
      ) : null}
    </ShellHeaderRow>
  )
}
