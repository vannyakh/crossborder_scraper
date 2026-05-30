import { MarkerType } from '@xyflow/react'
import { buildAgentConfigPorts, resolveConfigEdgeHandles } from './project-flow-layout'
import { hasMainOutgoing, MAIN_FLOW_HANDLES, nodeEmitsMainFlow } from './project-flow-connect'
import { roleForKind } from './project-node-meta'
import { STICKY_NOTE_DEFAULT_H, STICKY_NOTE_DEFAULT_W } from './project-sticky-colors'
import type {
  ProjectFlowEdgeData,
  FlowExecutionStatus,
  RemotePeerHighlight,
} from './project-flow-types'
import type { ProjectFlowCanvasOptions } from './project-flow-canvas-options'
import type { ProjectDetail, ProjectEdgeKind, ProjectNode } from './project-sample-data'
import type {
  ProjectServiceEdge,
  ProjectServiceNode,
  ProjectStickyFlowNode,
} from './project-flow-types'

const FLOW_SUCCESS_STROKE = '#22c55e'

/** Stacking order — use with React Flow `zIndexMode="manual"`. Stickies sit under edges; workflow nodes on top. */
export const PROJECT_FLOW_Z = {
  sticky: 0,
  edgeNetwork: 50,
  edgeMain: 100,
  workflow: 200,
  /** Selected / dragging sticky — temporarily above edges for handles and toolbar. */
  stickyRaised: 250,
} as const

/** Canvas geometry — React Flow owns these during drag/resize; omit from resync signature. */
function projectNodeWithoutGeometry({ x, y, noteWidth, noteHeight, ...node }: ProjectNode) {
  void x
  void y
  void noteWidth
  void noteHeight
  return node
}

export function projectFlowStructureSignature(project: ProjectDetail): string {
  return JSON.stringify({
    id: project.id,
    nodes: project.nodes.map(projectNodeWithoutGeometry),
    edges: project.edges,
  })
}

/** Full canvas payload for autosave — includes node positions and sticky dimensions. */
export function projectFlowPersistSignature(project: ProjectDetail): string {
  return JSON.stringify({
    id: project.id,
    nodes: project.nodes,
    edges: project.edges,
  })
}

/** Layout-only fingerprint — drives React Flow resync when peers move nodes. */
export function projectFlowLayoutSignature(project: ProjectDetail): string {
  return JSON.stringify(
    project.nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      noteWidth: node.noteWidth ?? null,
      noteHeight: node.noteHeight ?? null,
    })),
  )
}

export type ProjectFlowSyncOptions = {
  runningNodeId?: string | null
  completedNodeIds?: Set<string>
  /** All steps finished — green edges until the next run. */
  runSucceeded?: boolean
  canvas?: Pick<ProjectFlowCanvasOptions, 'showNetworkTraffic' | 'hideConnections'>
  showVariableRefs?: boolean
  stickyEditId?: string | null
  remotePeerHighlights?: Record<string, RemotePeerHighlight[]>
}

export function projectFlowOptionsSignature(options: ProjectFlowSyncOptions): string {
  const completed = options.completedNodeIds
  return JSON.stringify({
    runningNodeId: options.runningNodeId ?? null,
    completedNodeIds: completed ? [...completed].sort() : null,
    runSucceeded: options.runSucceeded ?? false,
    canvas: options.canvas ?? null,
    showVariableRefs: options.showVariableRefs ?? true,
    stickyEditId: options.stickyEditId ?? null,
    remotePeerHighlights: options.remotePeerHighlights ?? null,
  })
}

export function preserveFlowNodeUiState(
  current: Array<ProjectServiceNode | ProjectStickyFlowNode>,
  next: Array<ProjectServiceNode | ProjectStickyFlowNode>,
): Array<ProjectServiceNode | ProjectStickyFlowNode> {
  const currentById = new Map(current.map((node) => [node.id, node]))
  return next.map((node) => {
    const prev = currentById.get(node.id)
    if (!prev) return node
    if (prev.dragging) {
      return {
        ...node,
        position: prev.position,
        width: prev.width,
        height: prev.height,
        selected: prev.selected,
        dragging: prev.dragging,
      }
    }
    return {
      ...node,
      selected: prev.selected,
      dragging: prev.dragging,
    }
  })
}
export function projectDetailToFlow(
  project: ProjectDetail,
  options?: ProjectFlowSyncOptions,
): { nodes: Array<ProjectServiceNode | ProjectStickyFlowNode>; edges: ProjectServiceEdge[] } {
  const hideConnections = options?.canvas?.hideConnections ?? false
  const showNetworkTraffic = options?.canvas?.showNetworkTraffic ?? true
  const showVariableRefs = options?.showVariableRefs ?? true
  const completed = options?.completedNodeIds ?? new Set<string>()
  const runningId = options?.runningNodeId ?? null
  const runSucceeded = options?.runSucceeded ?? false
  const successEdgeClass = runSucceeded ? ' project-flow-edge--success' : ''
  const edgeStroke = runSucceeded ? FLOW_SUCCESS_STROKE : 'var(--project-flow-edge)'
  const configPorts = buildAgentConfigPorts(project)

  const workflowNodes: ProjectServiceNode[] = []
  const stickyNodes: ProjectStickyFlowNode[] = []

  for (const node of project.nodes) {
    if (roleForKind(node.kind, node.role) === 'note') {
      stickyNodes.push({
        id: node.id,
        type: 'sticky',
        position: { x: node.x, y: node.y },
        width: node.noteWidth ?? STICKY_NOTE_DEFAULT_W,
        height: node.noteHeight ?? STICKY_NOTE_DEFAULT_H,
        zIndex: PROJECT_FLOW_Z.sticky,
        selectable: true,
        draggable: true,
        connectable: false,
        focusable: true,
        data: {
          node,
          beginEdit: options?.stickyEditId === node.id,
          remotePeerHighlights: options?.remotePeerHighlights?.[node.id],
        },
      })
      continue
    }

    const hasMainOutput = nodeEmitsMainFlow(node.kind, node.role)
    let executionStatus: FlowExecutionStatus = 'idle'
    if (completed.has(node.id)) executionStatus = 'done'
    else if (runningId === node.id) executionStatus = 'running'

    workflowNodes.push({
      id: node.id,
      type: 'workflow',
      position: { x: node.x, y: node.y },
      zIndex: PROJECT_FLOW_Z.workflow,
      data: {
        node,
        running: runningId === node.id,
        executionStatus,
        configInputs: configPorts.get(node.id),
        showVariableRefs,
        hasMainOutput,
        showAddStep: hasMainOutput && !hasMainOutgoing(project, node.id),
        remotePeerHighlights: options?.remotePeerHighlights?.[node.id],
      },
    })
  }

  const nodes = [...stickyNodes, ...workflowNodes]

  const visibleEdges = hideConnections
    ? []
    : project.edges.filter((edge) => {
        const kind: ProjectEdgeKind = edge.kind ?? 'main'
        if (kind === 'config' && !showNetworkTraffic) return false
        return true
      })

  const edges: ProjectServiceEdge[] = visibleEdges.map((edge) => {
    const kind: ProjectEdgeKind = edge.kind ?? 'main'

    if (kind === 'config') {
      const handles = resolveConfigEdgeHandles(project, edge)
      const edgeData: ProjectFlowEdgeData = { pathOffset: handles.pathOffset }

      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: 'config',
        className: `project-flow-edge--network${successEdgeClass}`,
        data: edgeData,
        zIndex: PROJECT_FLOW_Z.edgeNetwork,
        style: runSucceeded
          ? { stroke: FLOW_SUCCESS_STROKE, strokeWidth: 2, strokeDasharray: '6 4' }
          : undefined,
        selectable: false,
        focusable: false,
      }
    }

    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      sourceHandle: MAIN_FLOW_HANDLES.source,
      targetHandle: MAIN_FLOW_HANDLES.target,
      type: 'workflow',
      className: `project-flow-edge--main${successEdgeClass}`,
      zIndex: PROJECT_FLOW_Z.edgeMain,
      animated: !runSucceeded && runningId === edge.from,
      style: {
        stroke: edgeStroke,
        strokeWidth: runSucceeded ? 2 : 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 10,
        height: 10,
        color: edgeStroke,
      },
    }
  })

  return { nodes, edges }
}
