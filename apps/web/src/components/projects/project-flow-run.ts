import type { ProjectDetail } from './project-sample-data'

/** Ordered main-path node ids for run preview (triggers first, then downstream). */
export function buildMainFlowSteps(project: ProjectDetail): string[] {
  const mainEdges = project.edges.filter((e) => (e.kind ?? 'main') === 'main')
  const mainNodeIds = new Set(project.nodes.filter((n) => n.role !== 'config').map((n) => n.id))

  const triggers = project.nodes.filter((n) => n.role === 'trigger').map((n) => n.id)
  const roots =
    triggers.length > 0
      ? triggers
      : project.nodes
          .filter(
            (n) =>
              mainNodeIds.has(n.id) &&
              !mainEdges.some((e) => e.to === n.id && mainNodeIds.has(e.from)),
          )
          .map((n) => n.id)

  const ordered: string[] = []
  const visited = new Set<string>()

  function walk(id: string) {
    if (visited.has(id) || !mainNodeIds.has(id)) return
    visited.add(id)
    ordered.push(id)
    for (const edge of mainEdges) {
      if (edge.from === id && mainNodeIds.has(edge.to)) walk(edge.to)
    }
  }

  for (const id of roots) walk(id)
  for (const id of mainNodeIds) {
    if (!visited.has(id)) walk(id)
  }

  return ordered
}
