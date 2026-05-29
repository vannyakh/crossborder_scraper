import { MarkerType } from '@xyflow/react'
import { buildAgentConfigPorts, resolveConfigEdgeHandles } from './project-flow-layout'
import type { ProjectFlowEdgeData, FlowExecutionStatus } from './project-flow-types'
import type { ProjectFlowCanvasOptions } from './project-flow-canvas-options'
import type { ProjectDetail, ProjectEdgeKind } from './project-sample-data'
import type { ProjectServiceEdge, ProjectServiceNode } from './project-flow-types'
import { hasMainOutgoing, MAIN_FLOW_HANDLES, nodeEmitsMainFlow } from './project-flow-connect'

export function projectDetailToFlow(
  project: ProjectDetail,
  options?: {
    runningNodeId?: string | null
    completedNodeIds?: Set<string>
    canvas?: Pick<ProjectFlowCanvasOptions, 'showNetworkTraffic' | 'hideConnections'>
    showVariableRefs?: boolean
  },
): { nodes: ProjectServiceNode[]; edges: ProjectServiceEdge[] } {
  const hideConnections = options?.canvas?.hideConnections ?? false
  const showNetworkTraffic = options?.canvas?.showNetworkTraffic ?? true
  const showVariableRefs = options?.showVariableRefs ?? true
  const completed = options?.completedNodeIds ?? new Set<string>()
  const runningId = options?.runningNodeId ?? null
  const configPorts = buildAgentConfigPorts(project)
  const nodes: ProjectServiceNode[] = project.nodes.map((node) => {
    const hasMainOutput = nodeEmitsMainFlow(node.kind, node.role)
    let executionStatus: FlowExecutionStatus = 'idle'
    if (completed.has(node.id)) executionStatus = 'done'
    else if (runningId === node.id) executionStatus = 'running'

    return {
      id: node.id,
      type: 'workflow',
      position: { x: node.x, y: node.y },
      data: {
        node,
        running: runningId === node.id,
        executionStatus,
        configInputs: configPorts.get(node.id),
        showVariableRefs,
        hasMainOutput,
        showAddStep: hasMainOutput && !hasMainOutgoing(project, node.id),
      },
    }
  })

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
        className: 'project-flow-edge--network',
        data: edgeData,
        style: undefined,
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
      className: 'project-flow-edge--main',
      animated: runningId === edge.from,
      style: {
        stroke: 'var(--project-flow-edge)',
        strokeWidth: 2.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: 'var(--project-flow-edge)',
      },
    }
  })

  return { nodes, edges }
}
