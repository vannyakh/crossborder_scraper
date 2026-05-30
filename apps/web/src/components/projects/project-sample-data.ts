/** Project flow types and mock re-exports — no API wiring yet. */

import type { StickyNoteColor } from './project-sticky-colors'

export type ProjectNodeKind =
  | 'github'
  | 'redis'
  | 'postgres'
  | 'scrape'
  | 'agent'
  | 'webhook'
  | 'schedule'
  | 'export'
  | 'condition'
  | 'notify'
  | 'sticky'

export type ProjectNodeRole = 'trigger' | 'action' | 'agent' | 'config' | 'note'

export type ProjectNodeStatus = 'online' | 'offline'

export type ProjectNode = {
  id: string
  kind: ProjectNodeKind
  label: string
  x: number
  y: number
  /** Canvas shape — trigger pill, agent wide card, config circle, action square */
  role?: ProjectNodeRole
  /** Secondary line under the label (e.g. tool id) */
  subtitle?: string
  /** Public host or connection label */
  host?: string
  status?: ProjectNodeStatus
  /** Volume name, replica summary, etc. */
  detail?: string
  /** Canvas sticky note body (kind sticky) — markdown supported */
  noteBody?: string
  noteWidth?: number
  noteHeight?: number
  /** Sticky card color preset */
  noteColor?: StickyNoteColor
  /** Gateway agent user prompt (parameters tab) */
  agentPrompt?: string
  /** Dynamic option values from node-config JSON schemas */
  options?: Record<string, string | boolean | number>
}

export type ProjectEdgeKind = 'main' | 'config'

/**
 * 0 = Model (required), 1 = Memory, 2+ = Tool slots.
 * Stored on config edges so drag-to-slot placement is preserved.
 */
export type AgentSlotIndex = 0 | 1 | 2

export type ProjectEdge = {
  id: string
  from: string
  to: string
  kind?: ProjectEdgeKind
  /** Which agent bottom slot this config edge occupies (0=Model, 1=Memory, 2=Tool) */
  slotIndex?: AgentSlotIndex
}

export type ProjectEnvironment = 'production' | 'staging' | 'development'

export type ProjectSummary = {
  id: string
  name: string
  environment: ProjectEnvironment
  servicesOnline: number
  servicesTotal: number
  updatedAt: string
  /** Short blurb for settings and list cards */
  description?: string
  previewNodes: ProjectNode[]
  previewEdges: ProjectEdge[]
}

export type ProjectDetail = ProjectSummary & {
  nodes: ProjectNode[]
  edges: ProjectEdge[]
}

export { SAMPLE_PROJECTS, createStarterProject, getSampleProject } from './project-mock-data'

export { NODE_PALETTE } from './project-node-palette'
