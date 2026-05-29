import { Box, Flex } from '@chakra-ui/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { getSampleProject, type ProjectDetail } from '../../projects/project-sample-data'
import { usePanelAppearance } from '../../../hooks/use-panel-appearance'
import { ROUTE_PATHS } from '../../../routes/route-config'
import { PageTransition } from '../../motion/PageTransition'
import { RouteProgress } from '../RouteProgress'
import { ProjectShellHeader } from './ProjectShellHeader'
import { ProjectShellSidebar } from './ProjectShellSidebar'
import { ProjectWorkspaceProvider } from './project-workspace-context'

type ProjectLocationState = {
  project?: ProjectDetail
}

type ProjectShellProps = {
  /** Optional project override; falls back to router state or sample catalog */
  project?: ProjectDetail
}

export function ProjectShell({ project: projectProp }: ProjectShellProps) {
  usePanelAppearance()
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const [running, setRunning] = useState(false)

  const baseProject = useMemo(() => {
    if (projectProp) return projectProp
    const fromState = (location.state as ProjectLocationState | null)?.project
    if (fromState && fromState.id === projectId) return fromState
    if (!projectId) return null
    return getSampleProject(projectId) ?? null
  }, [projectProp, projectId, location.state])

  const [projectDraft, setProjectDraft] = useState<ProjectDetail | null>(null)

  useEffect(() => {
    if (baseProject) setProjectDraft(baseProject)
  }, [baseProject])

  const resolvedProject = projectDraft ?? baseProject

  const setProject = useCallback<Dispatch<SetStateAction<ProjectDetail>>>(
    (action) => {
      setProjectDraft((prev) => {
        const current = prev ?? baseProject
        if (!current) return prev
        return typeof action === 'function' ? action(current) : action
      })
    },
    [baseProject],
  )

  if (!projectId || !resolvedProject) {
    return <Navigate to={ROUTE_PATHS.projects.base} replace />
  }

  return (
    <ProjectWorkspaceProvider value={{ project: resolvedProject, setProject, running, setRunning }}>
      <Flex
        className="project-shell"
        direction="column"
        h="100dvh"
        maxH="100dvh"
        overflow="hidden"
        position="relative"
      >
        <RouteProgress />
        <ProjectShellHeader />

        <Flex flex={1} minH={0} overflow="hidden" w="full">
          <ProjectShellSidebar />

          <Box
            flex={1}
            minH={0}
            minW={0}
            h="100%"
            className="project-shell-main panel-main-surface"
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Box>
        </Flex>
      </Flex>
    </ProjectWorkspaceProvider>
  )
}
