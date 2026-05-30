import { ROLE_DEFAULTS } from './project-node-meta'
import type { AgentSlotIndex, ProjectDetail, ProjectEdge, ProjectNode } from './project-sample-data'

// ---------------------------------------------------------------------------
// Agent fixed slot definitions — always rendered even when unoccupied
// ---------------------------------------------------------------------------

export type AgentSlotDef = {
  slotIndex: AgentSlotIndex
  /** i18n key for empty slot label */
  labelKey: string
  required: boolean
  /** % from left of agent card */
  leftPercent: number
  /** React Flow handle id when slot is empty */
  emptyHandleId: string
  /** React Flow handle id when slot is occupied */
  occupiedHandleId: string
}

export const AGENT_SLOT_DEFS: AgentSlotDef[] = [
  {
    slotIndex: 0,
    labelKey: 'projects.flow.slots.model',
    required: true,
    leftPercent: 22,
    emptyHandleId: 'config-in-0',
    occupiedHandleId: 'config-in-0',
  },
  {
    slotIndex: 1,
    labelKey: 'projects.flow.slots.memory',
    required: false,
    leftPercent: 50,
    emptyHandleId: 'config-in-1',
    occupiedHandleId: 'config-in-1',
  },
  {
    slotIndex: 2,
    labelKey: 'projects.flow.slots.tool',
    required: false,
    leftPercent: 78,
    emptyHandleId: 'config-in-2',
    occupiedHandleId: 'config-in-2',
  },
]

// ---------------------------------------------------------------------------
// ConfigInputPort — one entry per slot (occupied or empty)
// ---------------------------------------------------------------------------

export type ConfigInputPort = {
  handleId: string
  /** Display label when occupied (source node name) */
  label: string
  /** i18n key for empty slot */
  labelKey?: string
  leftPercent: number
  slotIndex: AgentSlotIndex
  required: boolean
  /** True when a config edge fills this slot */
  occupied: boolean
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const CONFIG_W = ROLE_DEFAULTS.config.w

function configCenterX(node: ProjectNode): number {
  return node.x + CONFIG_W / 2
}

/**
 * Resolve which slot a config edge occupies.
 * Prefers explicit `slotIndex` on the edge; falls back to positional ordering
 * for legacy edges created before slot tracking was added.
 */
function resolveEdgeSlot(edge: ProjectEdge, allConfigEdgesToNode: ProjectEdge[]): AgentSlotIndex {
  if (edge.slotIndex !== undefined) return edge.slotIndex
  // Legacy fallback: first config edge → slot 1 (Memory), second → slot 2 (Tool)
  // Slot 0 (Model) is intentionally left for future LLM node kinds.
  const idx = allConfigEdgesToNode.indexOf(edge)
  return Math.min(idx + 1, 2) as AgentSlotIndex
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Always returns all 3 fixed agent slots per agent node.
 * Occupied slots carry the source node's label; empty slots use the slot def label.
 */
export function buildAgentConfigPorts(project: ProjectDetail): Map<string, ConfigInputPort[]> {
  const nodeById = new Map(project.nodes.map((n) => [n.id, n]))
  const byTarget = configEdgesToAgent(project)
  const portsByAgent = new Map<string, ConfigInputPort[]>()

  for (const node of project.nodes) {
    if (node.role !== 'agent' && node.kind !== 'agent') continue

    const edges = byTarget.get(node.id) ?? []

    // Build occupied-slot map
    const occupiedBySlot = new Map<AgentSlotIndex, ProjectEdge>()
    for (const edge of edges) {
      const slot = resolveEdgeSlot(edge, edges)
      if (!occupiedBySlot.has(slot)) occupiedBySlot.set(slot, edge)
    }

    const ports: ConfigInputPort[] = AGENT_SLOT_DEFS.map((def) => {
      const edge = occupiedBySlot.get(def.slotIndex)
      if (edge) {
        const source = nodeById.get(edge.from)
        const label = source?.subtitle ?? source?.label ?? def.labelKey
        return {
          handleId: def.occupiedHandleId,
          label,
          labelKey: def.labelKey,
          leftPercent: def.leftPercent,
          slotIndex: def.slotIndex,
          required: def.required,
          occupied: true,
        }
      }
      return {
        handleId: def.emptyHandleId,
        label: def.labelKey,
        labelKey: def.labelKey,
        leftPercent: def.leftPercent,
        slotIndex: def.slotIndex,
        required: def.required,
        occupied: false,
      }
    })

    portsByAgent.set(node.id, ports)
  }

  return portsByAgent
}

/**
 * Resolves React Flow source/target handle ids for a config edge.
 * Uses `slotIndex` if present, otherwise falls back to positional ordering.
 */
export function resolveConfigEdgeHandles(
  project: ProjectDetail,
  edge: ProjectEdge,
): { sourceHandle: string; targetHandle: string; pathOffset: number } {
  const allConfigEdges = project.edges
    .filter((e) => (e.kind ?? 'main') === 'config' && e.to === edge.to)
    .sort((a, b) => {
      const na = project.nodes.find((n) => n.id === a.from)
      const nb = project.nodes.find((n) => n.id === b.from)
      return (na?.x ?? 0) - (nb?.x ?? 0)
    })

  const slotIdx = resolveEdgeSlot(edge, allConfigEdges)
  const def = AGENT_SLOT_DEFS.find((d) => d.slotIndex === slotIdx) ?? AGENT_SLOT_DEFS[1]

  const count = allConfigEdges.length
  const posIndex = allConfigEdges.indexOf(edge)
  const pathOffset = count > 1 ? (posIndex - (count - 1) / 2) * 10 : 0

  return {
    sourceHandle: 'config-out',
    targetHandle: def.occupiedHandleId,
    pathOffset,
  }
}

/** leftPercent under the agent card for a config source node (for legacy path). */
export function configSourceLeftPercent(agent: ProjectNode, source: ProjectNode): number {
  const center = configCenterX(source)
  const agentW = ROLE_DEFAULTS.agent.w
  const pct = ((center - agent.x) / agentW) * 100
  return Math.round(Math.min(86, Math.max(14, pct)))
}

export type AgentSlotSource = {
  slotIndex: AgentSlotIndex
  labelKey: string
  required: boolean
  occupied: boolean
  sourceNode: ProjectNode | null
}

/** Wired sub-nodes for each agent slot (Model / Memory / Tool). */
export function getAgentSlotSources(project: ProjectDetail, agentId: string): AgentSlotSource[] {
  const ports = buildAgentConfigPorts(project).get(agentId)
  if (!ports) return []

  const edges = project.edges.filter((e) => (e.kind ?? 'main') === 'config' && e.to === agentId)
  const nodeById = new Map(project.nodes.map((n) => [n.id, n]))

  return ports.map((port) => {
    let sourceNode: ProjectNode | null = null
    if (port.occupied) {
      for (const edge of edges) {
        const slot = resolveEdgeSlot(edge, edges)
        if (slot === port.slotIndex) {
          sourceNode = nodeById.get(edge.from) ?? null
          break
        }
      }
    }
    return {
      slotIndex: port.slotIndex,
      labelKey: port.labelKey ?? AGENT_SLOT_DEFS[port.slotIndex]?.labelKey ?? '',
      required: port.required,
      occupied: port.occupied,
      sourceNode,
    }
  })
}
