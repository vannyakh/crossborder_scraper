import { Box, Flex, Spinner, VStack } from '@chakra-ui/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { getOrCreateCollaborationClientId } from '../../../lib/api/project-collaboration'
import type { ProjectDetail } from '../../projects/project-sample-data'
import { useProjectCollaboration } from '../../projects/use-project-collaboration'
import { useProjectFlowPersistence } from '../../projects/use-project-flow-persistence'
import { useProjectQuery } from '../../../hooks/queries/use-projects-query'
import { usePanelAppearance } from '../../../hooks/use-panel-appearance'
import { useLocale } from '../../../hooks/use-locale'
import { ROUTE_PATHS } from '../../../routes/route-config'
import { PageTransition } from '../../motion/PageTransition'
import { RouteProgress } from '../RouteProgress'
import { DataListEmpty } from '../../ui/DataList'
import { ProjectShellHeader } from './ProjectShellHeader'
import { ProjectShellSidebar } from './ProjectShellSidebar'
import { ProjectWorkspaceProvider } from './project-workspace-context'

type ProjectShellProps = {
  /** Optional project override (tests/storybook) */
  project?: ProjectDetail
}

export function ProjectShell({ project: projectProp }: ProjectShellProps) {
  usePanelAppearance()
  const { t } = useLocale()
  const { projectId, section } = useParams<{ projectId: string; section?: string }>()
  const location = useLocation()
  const [running, setRunning] = useState(false)
  const { data: loaded, isLoading, isError } = useProjectQuery(projectProp ? undefined : projectId)

  const baseProject = projectProp ?? loaded ?? null
  const [projectDraft, setProjectDraft] = useState<ProjectDetail | null>(null)

  useEffect(() => {
    if (baseProject) setProjectDraft(baseProject)
  }, [baseProject])

  const resolvedProject = projectDraft ?? baseProject
  const flowEnabled = Boolean(resolvedProject && (!section || section === 'flow'))
  const clientId = useMemo(() => getOrCreateCollaborationClientId(), [])

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

  const { markRemoteRevision } = useProjectFlowPersistence(
    projectId ?? '',
    projectProp ? null : resolvedProject,
    { clientId },
  )

  const handleRemoteFlow = useCallback(
    (remote: ProjectDetail) => {
      markRemoteRevision(remote)
      setProject(remote)
    },
    [markRemoteRevision, setProject],
  )

  const collaboration = useProjectCollaboration({
    projectId: projectId ?? '',
    clientId,
    enabled: flowEnabled && !projectProp,
    flowRevision: resolvedProject?.flowRevision ?? 0,
    onRemoteFlow: handleRemoteFlow,
  })

  const workspaceValue = useMemo(
    () =>
      resolvedProject
        ? { project: resolvedProject, setProject, running, setRunning, collaboration }
        : null,
    [resolvedProject, setProject, running, collaboration],
  )

  if (!projectId) {
    return <Navigate to={ROUTE_PATHS.projects.base} replace />
  }

  if (!projectProp && isLoading) {
    return (
      <Flex className="project-shell" align="center" justify="center" h="100dvh">
        <Spinner size="lg" />
      </Flex>
    )
  }

  if (!projectProp && (isError || !resolvedProject)) {
    return (
      <Flex className="project-shell" align="center" justify="center" h="100dvh">
        <VStack gap={2}>
          <DataListEmpty>{t('projects.notFound')}</DataListEmpty>
        </VStack>
      </Flex>
    )
  }

  if (!workspaceValue) {
    return <Navigate to={ROUTE_PATHS.projects.base} replace />
  }

  return (
    <ProjectWorkspaceProvider value={workspaceValue}>
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
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </Box>
        </Flex>
      </Flex>
    </ProjectWorkspaceProvider>
  )
}
