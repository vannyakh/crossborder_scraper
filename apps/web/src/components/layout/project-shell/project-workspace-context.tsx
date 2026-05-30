import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { ProjectCollaborationState } from '../../../lib/api/project-collaboration'
import type { ProjectDetail } from '../../projects/project-sample-data'

export type ProjectWorkspaceValue = {
  project: ProjectDetail
  setProject: Dispatch<SetStateAction<ProjectDetail>>
  running: boolean
  setRunning: Dispatch<SetStateAction<boolean>>
  collaboration: ProjectCollaborationState
}

const ProjectWorkspaceContext = createContext<ProjectWorkspaceValue | null>(null)

export function ProjectWorkspaceProvider({
  value,
  children,
}: {
  value: ProjectWorkspaceValue
  children: ReactNode
}) {
  return (
    <ProjectWorkspaceContext.Provider value={value}>{children}</ProjectWorkspaceContext.Provider>
  )
}

export function useProjectWorkspace(): ProjectWorkspaceValue {
  const ctx = useContext(ProjectWorkspaceContext)
  if (!ctx) {
    throw new Error('useProjectWorkspace must be used within ProjectShell')
  }
  return ctx
}
