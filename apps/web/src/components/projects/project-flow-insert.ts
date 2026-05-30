import { createProjectNode } from './project-node-factory'
import type { ProjectDetail, ProjectEdge, ProjectNodeKind } from './project-sample-data'

const MAIN_STEP_X = 220

/** Place a new main-path node after `sourceId` and wire a main edge. */
export function insertMainNodeAfter(
  project: ProjectDetail,
  sourceId: string,
  kind: ProjectNodeKind,
  label: string,
): { node: ReturnType<typeof createProjectNode>; edge: ProjectEdge } | null {
  const source = project.nodes.find((n) => n.id === sourceId)
  if (!source || source.role === 'config') return null

  const node = createProjectNode(kind, label, project.nodes)
  node.x = source.x + MAIN_STEP_X
  node.y = source.y

  const edge: ProjectEdge = {
    id: `e-${sourceId}-${node.id}`,
    from: sourceId,
    to: node.id,
    kind: 'main',
  }

  return { node, edge }
}

/** Insert a main-path node between two connected steps and rewire edges. */
export function insertMainNodeBetween(
  project: ProjectDetail,
  sourceId: string,
  targetId: string,
  kind: ProjectNodeKind,
  label: string,
): {
  node: ReturnType<typeof createProjectNode>
  edges: ProjectEdge[]
  removeEdgeId: string
} | null {
  const source = project.nodes.find((n) => n.id === sourceId)
  const target = project.nodes.find((n) => n.id === targetId)
  if (!source || !target || source.role === 'config' || target.role === 'config') return null

  const existing = project.edges.find(
    (e) => e.from === sourceId && e.to === targetId && (e.kind ?? 'main') === 'main',
  )
  if (!existing) return null

  const node = createProjectNode(kind, label, project.nodes)
  node.x = Math.round((source.x + target.x) / 2)
  node.y = Math.round((source.y + target.y) / 2)

  const edges: ProjectEdge[] = [
    { id: `e-${sourceId}-${node.id}`, from: sourceId, to: node.id, kind: 'main' },
    { id: `e-${node.id}-${targetId}`, from: node.id, to: targetId, kind: 'main' },
  ]

  return { node, edges, removeEdgeId: existing.id }
}
