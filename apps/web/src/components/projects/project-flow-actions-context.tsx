import { createContext, useContext, type ReactNode } from 'react'

export type ProjectFlowActions = {
  openNodeConfig: (nodeId: string) => void
  duplicateNode: (nodeId: string) => void
  removeNode: (nodeId: string) => void
  openAddAfter: (nodeId: string) => void
  executeStep: (nodeId: string) => void
  copyNode: (nodeId: string) => void
  tidyWorkflow: () => void
  selectAllNodes: () => void
  clearSelection: () => void
  previewNodeAction: (action: string) => void
}

const ProjectFlowActionsContext = createContext<ProjectFlowActions | null>(null)

export function ProjectFlowActionsProvider({
  value,
  children,
}: {
  value: ProjectFlowActions
  children: ReactNode
}) {
  return (
    <ProjectFlowActionsContext.Provider value={value}>
      {children}
    </ProjectFlowActionsContext.Provider>
  )
}

export function useProjectFlowActions(): ProjectFlowActions | null {
  return useContext(ProjectFlowActionsContext)
}
