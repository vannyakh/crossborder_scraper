import type { AgentSlotIndex, ProjectDetail, ProjectNode } from './project-sample-data'

/** Agent slot wiring profile — controls sub-node toolbar and edge hover behavior. */
export type SubNodeProfile = 'model' | 'plugin'

export type SubNodeToolbarCapabilities = {
  execute: boolean
  power: boolean
  remove: boolean
  more: boolean
}

export type SubNodeMenuCapabilities = {
  open: boolean
  replace: boolean
  duplicate: boolean
  copy: boolean
  remove: boolean
}

export type SubNodeCapabilities = {
  profile: SubNodeProfile
  toolbar: SubNodeToolbarCapabilities
  menu: SubNodeMenuCapabilities
}

/** Slot 0 = chat model — minimal chrome (n8n OpenAI sub-node pattern). */
const MODEL_SLOT: AgentSlotIndex = 0

const PROFILE_DEFS: Record<
  SubNodeProfile,
  { toolbar: SubNodeToolbarCapabilities; menu: SubNodeMenuCapabilities }
> = {
  model: {
    toolbar: { execute: false, power: true, remove: true, more: true },
    menu: { open: true, replace: true, duplicate: false, copy: false, remove: true },
  },
  plugin: {
    toolbar: { execute: true, power: true, remove: true, more: true },
    menu: { open: true, replace: true, duplicate: true, copy: true, remove: true },
  },
}

/** Config edge from this node, if wired to an agent slot. */
export function resolveConfigNodeSlot(
  project: ProjectDetail,
  nodeId: string,
): AgentSlotIndex | null {
  const edge = project.edges.find((e) => (e.kind ?? 'main') === 'config' && e.from === nodeId)
  return edge?.slotIndex ?? null
}

/** Resolve sub-node profile from agent slot or node kind fallback. */
export function resolveSubNodeProfile(project: ProjectDetail, node: ProjectNode): SubNodeProfile {
  const slot = resolveConfigNodeSlot(project, node.id)
  if (slot === MODEL_SLOT) return 'model'
  if (node.kind === 'agent' && node.role === 'config') return 'model'
  return 'plugin'
}

export function getSubNodeCapabilities(
  project: ProjectDetail,
  node: ProjectNode,
): SubNodeCapabilities {
  const profile = resolveSubNodeProfile(project, node)
  return { profile, ...PROFILE_DEFS[profile] }
}
