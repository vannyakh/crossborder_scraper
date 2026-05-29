import type { ProjectDetail, ProjectNode } from './project-sample-data'

const MAIN_X_GAP = 220
const CONFIG_Y_OFFSET = 150
const CONFIG_X_STAGGER = 90

/** Left-to-right main flow with config nodes tucked under their agent target. */
export function applyFlowAutoLayout(project: ProjectDetail): ProjectNode[] {
  const nodeById = new Map(project.nodes.map((n) => [n.id, n]))
  const mainIds = new Set(project.nodes.filter((n) => n.role !== 'config').map((n) => n.id))

  const mainEdges = project.edges.filter((e) => (e.kind ?? 'main') === 'main')
  const incoming = new Map<string, string[]>()
  for (const edge of mainEdges) {
    if (!mainIds.has(edge.from) || !mainIds.has(edge.to)) continue
    const list = incoming.get(edge.to) ?? []
    list.push(edge.from)
    incoming.set(edge.to, list)
  }

  const ordered: string[] = []
  const visited = new Set<string>()
  const triggers = project.nodes.filter((n) => n.role === 'trigger').map((n) => n.id)
  const seeds = triggers.length
    ? triggers
    : [project.nodes.find((n) => mainIds.has(n.id))?.id].filter(Boolean)

  function walk(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    ordered.push(id)
    for (const edge of mainEdges) {
      if (edge.from === id && mainIds.has(edge.to)) walk(edge.to)
    }
  }

  for (const id of seeds as string[]) walk(id)
  for (const id of mainIds) {
    if (!visited.has(id)) walk(id)
  }

  const positions = new Map<string, { x: number; y: number }>()
  let x = 48
  const y = 160
  for (const id of ordered) {
    positions.set(id, { x, y })
    x += MAIN_X_GAP
  }

  const configEdges = project.edges.filter((e) => (e.kind ?? 'main') === 'config')
  const configsByAgent = new Map<string, string[]>()
  for (const edge of configEdges) {
    const list = configsByAgent.get(edge.to) ?? []
    list.push(edge.from)
    configsByAgent.set(edge.to, list)
  }

  for (const [agentId, configIds] of configsByAgent) {
    const agentPos = positions.get(agentId)
    const agent = nodeById.get(agentId)
    const baseX = agentPos?.x ?? agent?.x ?? 280
    const baseY = agentPos?.y ?? agent?.y ?? 160
    configIds.forEach((configId, index) => {
      positions.set(configId, {
        x: baseX - CONFIG_X_STAGGER + index * CONFIG_X_STAGGER,
        y: baseY + CONFIG_Y_OFFSET,
      })
    })
  }

  for (const node of project.nodes) {
    if (node.role === 'config' && !positions.has(node.id)) {
      positions.set(node.id, { x: node.x, y: node.y + CONFIG_Y_OFFSET })
    }
  }

  return project.nodes.map((node) => {
    const pos = positions.get(node.id)
    return pos ? { ...node, x: pos.x, y: pos.y } : node
  })
}

export function snapshotNodePositions(
  project: ProjectDetail,
): Map<string, { x: number; y: number }> {
  return new Map(project.nodes.map((n) => [n.id, { x: n.x, y: n.y }]))
}

export function restoreNodePositions(
  nodes: ProjectNode[],
  baseline: Map<string, { x: number; y: number }>,
): ProjectNode[] {
  return nodes.map((node) => {
    const pos = baseline.get(node.id)
    return pos ? { ...node, x: pos.x, y: pos.y } : node
  })
}
