import { Box } from '@chakra-ui/react'
import { Navigate, useParams } from 'react-router-dom'
import { FadeIn } from '../components/motion/FadeIn'
import { ProjectCanvasPanel } from '../components/projects/ProjectCanvasPanel'
import { ProjectLogsPanel } from '../components/projects/ProjectLogsPanel'
import {
  DEFAULT_PROJECT_SECTION,
  isProjectSectionId,
  type ProjectSectionId,
} from '../components/projects/project-sections'
import { ProjectRuntimePanel } from '../components/projects/ProjectRuntimePanel'
import { ProjectSettingsPanel } from '../components/projects/ProjectSettingsPanel'
import { projectSectionPath } from '../routes/route-config'

function ProjectSectionContent({
  section,
  projectId,
}: {
  section: ProjectSectionId
  projectId: string
}) {
  switch (section) {
    case 'flow':
      return <ProjectCanvasPanel />
    case 'runtime':
      return <ProjectRuntimePanel />
    case 'logs':
      return <ProjectLogsPanel />
    case 'settings':
      return <ProjectSettingsPanel key={projectId} />
    default:
      return null
  }
}

export function ProjectPage() {
  const { projectId, section: sectionParam } = useParams<{
    projectId: string
    section?: string
  }>()

  if (!projectId) {
    return <Navigate to="/projects" replace />
  }

  if (!sectionParam) {
    return <Navigate to={projectSectionPath(projectId, DEFAULT_PROJECT_SECTION)} replace />
  }

  if (!isProjectSectionId(sectionParam)) {
    return <Navigate to={projectSectionPath(projectId, DEFAULT_PROJECT_SECTION)} replace />
  }

  const isFlow = sectionParam === 'flow'

  const content = <ProjectSectionContent section={sectionParam} projectId={projectId} />

  return (
    <Box
      className={isFlow ? 'project-page project-page--flow' : 'project-page'}
      flex={1}
      minH={0}
      h="100%"
      display="flex"
      flexDirection="column"
      overflow={isFlow ? 'hidden' : 'auto'}
    >
      {isFlow ? content : <FadeIn className="project-page-fade">{content}</FadeIn>}
    </Box>
  )
}
