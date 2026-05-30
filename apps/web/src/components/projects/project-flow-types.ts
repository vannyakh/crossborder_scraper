import type { Edge, Node } from '@xyflow/react'
import type { ConfigInputPort } from './project-flow-layout'
import type { ProjectNode } from './project-sample-data'

export type FlowExecutionStatus = 'idle' | 'running' | 'done'

export type ProjectFlowNodeData = {
  node: ProjectNode
  running?: boolean
  executionStatus?: FlowExecutionStatus
  /** Bottom input ports on agent nodes (one per config edge) */
  configInputs?: ConfigInputPort[]
  /** Show config port labels on agent nodes */
  showVariableRefs?: boolean
  /** Node can expose a main-path output handle */
  hasMainOutput?: boolean
  /** Show + add-step control when main output has no downstream edge yet */
  showAddStep?: boolean
}

export type ProjectFlowEdgeData = {
  pathOffset?: number
}

export type ProjectStickyNodeData = {
  node: ProjectNode
  /** When true, open markdown editor (from toolbar / action bar). */
  beginEdit?: boolean
}

export type ProjectServiceNode = Node<ProjectFlowNodeData, 'workflow'>
export type ProjectStickyFlowNode = Node<ProjectStickyNodeData, 'sticky'>
export type ProjectCanvasNode = ProjectServiceNode | ProjectStickyFlowNode
export type ProjectServiceEdge = Edge
