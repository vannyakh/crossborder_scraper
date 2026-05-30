import { roleForKind } from './project-node-meta'
import type { ProjectNode, ProjectNodeKind } from './project-sample-data'

function nextNodePosition(
  nodes: ProjectNode[],
  role: ReturnType<typeof roleForKind>,
): {
  x: number
  y: number
} {
  if (nodes.length === 0) {
    return { x: 280, y: 200 }
  }

  if (role === 'config') {
    const agent = nodes.find((n) => n.role === 'agent' || n.kind === 'agent')
    const configs = nodes.filter((n) => n.role === 'config')
    if (agent) {
      const index = configs.length
      return { x: agent.x - 40 - index * 90, y: agent.y + 50 + (index % 2) * 70 }
    }
  }

  const flowNodes = nodes.filter((n) => n.role !== 'config')
  const anchor = flowNodes[flowNodes.length - 1] ?? nodes[nodes.length - 1]
  return { x: anchor.x + 220, y: anchor.y + (flowNodes.length % 2 === 0 ? 0 : 90) }
}

export function createProjectNode(
  kind: ProjectNodeKind,
  label: string,
  existing: ProjectNode[],
): ProjectNode {
  const role = roleForKind(kind)
  const { x, y } = nextNodePosition(existing, role)
  const id = `node-${kind}-${Date.now().toString(36)}`

  const base: ProjectNode = { id, kind, label, x, y, role }

  switch (kind) {
    case 'webhook':
      return { ...base, subtitle: 'HTTP trigger', status: 'online' }
    case 'schedule':
      return { ...base, subtitle: 'cron: 0 * * * *', status: 'online' }
    case 'export':
      return { ...base, subtitle: 'marketplace export', host: 'export-review', status: 'online' }
    case 'condition':
      return { ...base, subtitle: 'if …', status: 'online' }
    case 'notify':
      return {
        ...base,
        subtitle: 'integrate: telegram',
        host: 'integrate-notify',
        status: 'online',
      }
    case 'agent':
      return { ...base, subtitle: 'Tools agent', host: 'gateway-tools', status: 'online' }
    case 'scrape':
      return { ...base, subtitle: 'Catalog step', status: 'online' }
    case 'github':
      return { ...base, subtitle: 'Deploy hook', host: 'github.com', status: 'online' }
    case 'postgres':
      return {
        ...base,
        role: 'config',
        subtitle: 'Database',
        host: 'postgres.internal',
        detail: '1 volume',
        status: 'online',
      }
    case 'redis':
      return {
        ...base,
        role: 'config',
        subtitle: 'Cache',
        host: 'redis.internal',
        detail: '1/1 replicas active',
        status: 'online',
      }
    default:
      return base
  }
}

/** Clone a canvas node with a new id and a small position offset. */
export function duplicateProjectNode(node: ProjectNode): ProjectNode {
  const id = `node-${node.kind}-${Date.now().toString(36)}`

  return {
    ...node,
    id,
    x: node.x + 40,
    y: node.y + 40,
  }
}
