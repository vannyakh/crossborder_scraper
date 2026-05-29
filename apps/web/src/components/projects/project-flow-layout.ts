import { ROLE_DEFAULTS } from './project-node-meta'
import type { ProjectDetail, ProjectEdge, ProjectNode } from './project-sample-data'

export type ConfigInputPort = {
  handleId: string
  label: string
  leftPercent: number
}

const AGENT_W = ROLE_DEFAULTS.agent.w
const CONFIG_W = ROLE_DEFAULTS.config.w

function configCenterX(node: ProjectNode): number {
  return node.x + CONFIG_W / 2
}

/** Place bottom target handle under the config node’s column — avoids crossed dashed lines */
function portLeftPercent(agent: ProjectNode, source: ProjectNode): number {
  const center = configCenterX(source)
  const pct = ((center - agent.x) / AGENT_W) * 100
  return Math.round(Math.min(86, Math.max(14, pct)))
}

function configEdgesToAgent(project: ProjectDetail): Map<string, ProjectEdge[]> {
  const byTarget = new Map<string, ProjectEdge[]>()
  for (const edge of project.edges) {
    if ((edge.kind ?? 'main') !== 'config') continue
    const list = byTarget.get(edge.to) ?? []
    list.push(edge)
    byTarget.set(edge.to, list)
  }
  for (const list of byTarget.values()) {
    list.sort((a, b) => {
      const na = project.nodes.find((n) => n.id === a.from)
      const nb = project.nodes.find((n) => n.id === b.from)
      return (na?.x ?? 0) - (nb?.x ?? 0)
    })
  }
  return byTarget
}

export function buildAgentConfigPorts(project: ProjectDetail): Map<string, ConfigInputPort[]> {
  const nodeById = new Map(project.nodes.map((n) => [n.id, n]))
  const byTarget = configEdgesToAgent(project)
  const portsByAgent = new Map<string, ConfigInputPort[]>()

  for (const [agentId, edges] of byTarget) {
    const agent = nodeById.get(agentId)
    if (!agent) continue

    const ports: ConfigInputPort[] = edges.map((edge, index) => {
      const source = nodeById.get(edge.from)
      const label = source?.subtitle ?? source?.label ?? `Input ${index + 1}`
      const leftPercent = source ? portLeftPercent(agent, source) : 14 + index * 24

      return {
        handleId: `config-in-${index}`,
        label,
        leftPercent,
      }
    })

    portsByAgent.set(agentId, ports)
  }

  return portsByAgent
}

export function resolveConfigEdgeHandles(
  project: ProjectDetail,
  edge: ProjectEdge,
): { sourceHandle: string; targetHandle: string; pathOffset: number } {
  const portsByAgent = buildAgentConfigPorts(project)
  const ports = portsByAgent.get(edge.to) ?? []
  const index = project.edges
    .filter((e) => (e.kind ?? 'main') === 'config' && e.to === edge.to)
    .sort((a, b) => {
      const na = project.nodes.find((n) => n.id === a.from)
      const nb = project.nodes.find((n) => n.id === b.from)
      return (na?.x ?? 0) - (nb?.x ?? 0)
    })
    .findIndex((e) => e.id === edge.id)

  const port = ports[index]
  const count = ports.length
  const pathOffset = count > 1 ? (index - (count - 1) / 2) * 10 : 0

  return {
    sourceHandle: 'config-out',
    targetHandle: port?.handleId ?? 'config-in-0',
    pathOffset,
  }
}
