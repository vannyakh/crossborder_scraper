import { createContext, useContext, type ReactNode } from 'react'

import type { AgentSlotIndex } from './project-sample-data'

export type ProjectFlowActions = {
  openNodeConfig: (nodeId: string) => void
  duplicateNode: (nodeId: string) => void
  removeNode: (nodeId: string) => void
  openAddAfter: (nodeId: string) => void
  /** Open add panel to insert a step between two linked nodes. */
  openAddBetween: (sourceId: string, targetId: string) => void
  removeEdge: (edgeId: string) => void
  /** Open the add-plugin panel targeting a specific agent slot. */
  openSlotAdd: (agentId: string, slotIndex: AgentSlotIndex) => void
  executeStep: (nodeId: string) => void
  runWorkflow: () => void
  toggleNodeActive: (nodeId: string) => void
  copyNode: (nodeId: string) => void
  tidyWorkflow: () => void
  selectAllNodes: () => void
  clearSelection: () => void
  previewNodeAction: (action: string) => void
  beginStickyEdit: (nodeId: string) => void
  endStickyEdit: () => void
  /** Pan to a canvas node and optionally open its config drawer. */
  focusCanvasNode: (nodeId: string, options?: { openConfig?: boolean }) => void
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
