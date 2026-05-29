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
