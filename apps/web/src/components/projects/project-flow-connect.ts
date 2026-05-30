import type { Connection, Edge } from '@xyflow/react'
import { AGENT_SLOT_DEFS } from './project-flow-layout'
import type { AgentSlotIndex, ProjectDetail, ProjectEdge } from './project-sample-data'
import { roleForKind } from './project-node-meta'

export const MAIN_FLOW_HANDLES = {
  source: 'main-out',
  target: 'main-in',
} as const

export const CONFIG_HANDLE = {
  source: 'config-out',
} as const

/** Extract slot index from a `config-in-N` handle id, or null if not a slot handle. */
export function slotIndexFromHandle(handleId: string | null | undefined): AgentSlotIndex | null {
  if (!handleId?.startsWith('config-in-')) return null
  const n = parseInt(handleId.replace('config-in-', ''), 10)
  if (n < 0 || n > 2 || isNaN(n)) return null
  return n as AgentSlotIndex
}

export function hasMainOutgoing(project: ProjectDetail, nodeId: string): boolean {
  return project.edges.some((edge) => edge.from === nodeId && (edge.kind ?? 'main') === 'main')
}

export function nodeEmitsMainFlow(
  kind: ProjectDetail['nodes'][number]['kind'],
  role?: ProjectDetail['nodes'][number]['role'],
): boolean {
  const r = roleForKind(kind, role)
  if (r === 'note') return false
  return r === 'trigger' || r === 'action' || r === 'agent'
}

export function nodeAcceptsMainFlow(
  kind: ProjectDetail['nodes'][number]['kind'],
  role?: ProjectDetail['nodes'][number]['role'],
): boolean {
  const r = roleForKind(kind, role)
  return r === 'action' || r === 'agent'
}

function asConnection(edge: Connection | Edge): Connection | null {
  if (!edge.source || !edge.target) return null
  return {
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
  }
}

/** Whether a user-drawn main-path link is allowed. */
export function isValidMainConnection(edge: Connection | Edge, project: ProjectDetail): boolean {
  const connection = asConnection(edge)
  if (!connection) return false

  const { source, target, sourceHandle, targetHandle } = connection
  if (!source || !target || source === target) return false
  if (sourceHandle !== MAIN_FLOW_HANDLES.source) return false
  if (targetHandle !== MAIN_FLOW_HANDLES.target) return false

  const sourceNode = project.nodes.find((n) => n.id === source)
  const targetNode = project.nodes.find((n) => n.id === target)
  if (!sourceNode || !targetNode) return false

  if (!nodeEmitsMainFlow(sourceNode.kind, sourceNode.role)) return false
  if (!nodeAcceptsMainFlow(targetNode.kind, targetNode.role)) return false
  if (hasMainOutgoing(project, source)) return false

  return true
}

export function mainConnectionToEdge(connection: Connection): ProjectEdge | null {
  const { source, target } = connection
  if (!source || !target) return null

  return {
    id: `e-${source}-${target}`,
    from: source,
    to: target,
    kind: 'main',
  }
}

// ---------------------------------------------------------------------------
// Config (plugin → agent) connection validation
// ---------------------------------------------------------------------------

/** Whether a drag from config-out → agent config-in-N is valid. */
export function isValidConfigConnection(edge: Connection | Edge, project: ProjectDetail): boolean {
  const connection = asConnection(edge)
  if (!connection) return false

  const { source, target, sourceHandle, targetHandle } = connection
  if (!source || !target || source === target) return false
  if (sourceHandle !== CONFIG_HANDLE.source) return false

  const slotIdx = slotIndexFromHandle(targetHandle)
  if (slotIdx === null) return false

  const sourceNode = project.nodes.find((n) => n.id === source)
  const targetNode = project.nodes.find((n) => n.id === target)
  if (!sourceNode || !targetNode) return false

  // Source must be a config circle; target must be an agent
  if (roleForKind(sourceNode.kind, sourceNode.role) !== 'config') return false
  if (roleForKind(targetNode.kind, targetNode.role) !== 'agent') return false

  // Source node already connected to this agent
  const alreadyConnected = project.edges.some(
    (e) => e.kind === 'config' && e.from === source && e.to === target,
  )
  if (alreadyConnected) return false

  // Slot already occupied
  const slotDef = AGENT_SLOT_DEFS.find((d) => d.slotIndex === slotIdx)
  if (!slotDef) return false
  const slotTaken = project.edges.some((e) => {
    if (e.kind !== 'config' || e.to !== target) return false
    const es = e.slotIndex
    return es === slotIdx
  })
  if (slotTaken) return false

  return true
}

/** Build a config ProjectEdge from a validated connection. */
export function configConnectionToEdge(connection: Connection): ProjectEdge | null {
  const { source, target, targetHandle } = connection
  if (!source || !target) return null

  const slotIdx = slotIndexFromHandle(targetHandle)
  if (slotIdx === null) return null

  return {
    id: `e-cfg-${source}-${target}-s${slotIdx}`,
    from: source,
    to: target,
    kind: 'config',
    slotIndex: slotIdx,
  }
}

/** Combined validator — covers both main-path and config-slot connections. */
export function isValidAnyConnection(edge: Connection | Edge, project: ProjectDetail): boolean {
  return isValidMainConnection(edge, project) || isValidConfigConnection(edge, project)
}

/** True when edge hover may show insert (+). Config/network links are delete-only. */
export function edgeHoverAllowsInsert(
  variant: 'main' | 'config',
  project: ProjectDetail,
  sourceId: string,
  targetId: string,
): boolean {
  if (variant !== 'main') return false

  const source = project.nodes.find((n) => n.id === sourceId)
  const target = project.nodes.find((n) => n.id === targetId)
  if (!source || !target) return false

  const sourceRole = roleForKind(source.kind, source.role)
  const targetRole = roleForKind(target.kind, target.role)
  if (sourceRole === 'note' || targetRole === 'note') return false
  if (sourceRole === 'config' || targetRole === 'config') return false

  return (
    nodeEmitsMainFlow(source.kind, source.role) && nodeAcceptsMainFlow(target.kind, target.role)
  )
}
