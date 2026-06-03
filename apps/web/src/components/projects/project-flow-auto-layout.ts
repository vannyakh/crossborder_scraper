import { AGENT_SLOT_DEFS } from './project-flow-layout'
import { ROLE_DEFAULTS, roleForKind } from './project-node-meta'
import type { AgentSlotIndex, ProjectDetail, ProjectEdge, ProjectNode } from './project-sample-data'
import {
  STICKY_NOTE_DEFAULT_H,
  STICKY_NOTE_DEFAULT_W,
  STICKY_NOTE_MIN_H,
  STICKY_NOTE_MIN_W,
} from './project-sticky-colors'
import { createWorkflowGraph } from './project-workflow-graph'

const MAIN_GAP = 64
const ROW_GAP = 48
const ORIGIN_X = 48
const ORIGIN_Y = 72
const CONFIG_BELOW_GAP = 28
const AGENT_TOOLS_H = 72
const AGENT_WRAP_PAD = 20
const CAPTION_H = 36
const COMPACT_CAPTION_W = 128

/** Sticky association zone — extends below the card so framed nodes stay grouped. */
const FRAME_EXTEND_SIDE = 28
const FRAME_EXTEND_BOTTOM = 200
const FRAME_PAD = 20
const FRAME_TOP_TEXT_PAD = 28
const FRAME_TOP_TEXT_LINE = 22

type Size = { w: number; h: number }
type Rect = { x: number; y: number; w: number; h: number }
type Point = { x: number; y: number }

type StickyFrameGroup = {
  stickyId: string
  memberIds: string[]
  anchorId: string
}

function resolveConfigSlot(edge: ProjectEdge, siblings: ProjectEdge[]): AgentSlotIndex {
  if (edge.slotIndex !== undefined) return edge.slotIndex
  const idx = siblings.indexOf(edge)
  return Math.min(Math.max(idx + 1, 0), 2) as AgentSlotIndex
}

/** Visual footprint used for spacing (includes captions below compact nodes). */
export function layoutFootprint(node: ProjectNode): Size {
  const role = roleForKind(node.kind, node.role)

  if (role === 'note') {
    return {
      w: node.noteWidth ?? STICKY_NOTE_DEFAULT_W,
      h: node.noteHeight ?? STICKY_NOTE_DEFAULT_H,
    }
  }

  if (role === 'agent') {
    return {
      w: ROLE_DEFAULTS.agent.w,
      h: ROLE_DEFAULTS.agent.h + AGENT_TOOLS_H + AGENT_WRAP_PAD,
    }
  }

  if (role === 'config') {
    return {
      w: Math.max(ROLE_DEFAULTS.config.w, COMPACT_CAPTION_W),
      h: ROLE_DEFAULTS.config.h + CAPTION_H,
    }
  }

  if (role === 'trigger' || role === 'action') {
    return {
      w: Math.max(ROLE_DEFAULTS[role].w, COMPACT_CAPTION_W),
      h: ROLE_DEFAULTS[role].h + CAPTION_H,
    }
  }

  return ROLE_DEFAULTS.action
}

function nodeRect(node: ProjectNode): Rect {
  const fp = layoutFootprint(node)
  return { x: node.x, y: node.y, w: fp.w, h: fp.h }
}

function stickyRect(sticky: ProjectNode): Rect {
  const fp = layoutFootprint(sticky)
  return { x: sticky.x, y: sticky.y, w: fp.w, h: fp.h }
}

function stickyFrameZone(sticky: ProjectNode): Rect {
  const base = stickyRect(sticky)
  return {
    x: base.x - FRAME_EXTEND_SIDE,
    y: base.y - FRAME_EXTEND_SIDE,
    w: base.w + FRAME_EXTEND_SIDE * 2,
    h: base.h + FRAME_EXTEND_BOTTOM + FRAME_EXTEND_SIDE,
  }
}

function rectOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function centerInRect(inner: Rect, outer: Rect): boolean {
  const cx = inner.x + inner.w / 2
  const cy = inner.y + inner.h / 2
  return cx >= outer.x && cx <= outer.x + outer.w && cy >= outer.y && cy <= outer.y + outer.h
}

function overlapArea(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)
  if (x2 <= x1 || y2 <= y1) return 0
  return (x2 - x1) * (y2 - y1)
}

function nodeAssociatesWithSticky(sticky: ProjectNode, node: ProjectNode): boolean {
  if (roleForKind(node.kind, node.role) === 'note') return false
  const zone = stickyFrameZone(sticky)
  const nr = nodeRect(node)
  return rectOverlap(zone, nr) || centerInRect(nr, zone)
}

/** Detect sticky ↔ workflow node frame groups from current canvas geometry. */
export function buildStickyFrameGroups(
  project: ProjectDetail,
  mainOrder: string[],
): StickyFrameGroup[] {
  const nodeById = new Map(project.nodes.map((n) => [n.id, n]))
  const stickies = project.nodes.filter((n) => roleForKind(n.kind, n.role) === 'note')
  const mainRank = new Map(mainOrder.map((id, index) => [id, index]))
  const groups: StickyFrameGroup[] = []

  for (const sticky of stickies) {
    const members = project.nodes.filter(
      (node) => node.id !== sticky.id && nodeAssociatesWithSticky(sticky, node),
    )
    if (members.length === 0) continue

    const anchor =
      [...members].sort((a, b) => {
        const rankA = mainRank.get(a.id) ?? Number.MAX_SAFE_INTEGER
        const rankB = mainRank.get(b.id) ?? Number.MAX_SAFE_INTEGER
        if (rankA !== rankB) return rankA - rankB
        const roleA = roleForKind(a.kind, a.role)
        const roleB = roleForKind(b.kind, b.role)
        if (roleA === 'trigger' && roleB !== 'trigger') return -1
        if (roleB === 'trigger' && roleA !== 'trigger') return 1
        const overlapA = overlapArea(nodeRect(a), stickyRect(sticky))
        const overlapB = overlapArea(nodeRect(b), stickyRect(sticky))
        return overlapB - overlapA
      })[0] ?? members[0]

    groups.push({
      stickyId: sticky.id,
      memberIds: members.map((m) => m.id),
      anchorId: anchor.id,
    })
  }

  // If a workflow node matches multiple stickies, keep the strongest association only.
  const claimed = new Set<string>()
  const resolved: StickyFrameGroup[] = []
  const sorted = [...groups].sort((a, b) => b.memberIds.length - a.memberIds.length)

  for (const group of sorted) {
    const sticky = nodeById.get(group.stickyId)
    if (!sticky) continue
    const members = group.memberIds.filter((id) => !claimed.has(id))
    if (members.length === 0) continue
    members.forEach((id) => claimed.add(id))
    const anchorId = members.includes(group.anchorId) ? group.anchorId : members[0]
    resolved.push({ stickyId: group.stickyId, memberIds: members, anchorId })
  }

  return resolved
}

function configPosition(
  agentPos: { x: number; y: number },
  slotIndex: AgentSlotIndex,
): { x: number; y: number } {
  const agentW = ROLE_DEFAULTS.agent.w
  const agentH = ROLE_DEFAULTS.agent.h + AGENT_TOOLS_H + AGENT_WRAP_PAD
  const slot = AGENT_SLOT_DEFS.find((def) => def.slotIndex === slotIndex) ?? AGENT_SLOT_DEFS[1]
  const configW = ROLE_DEFAULTS.config.w

  return {
    x: agentPos.x + (agentW * slot.leftPercent) / 100 - configW / 2,
    y: agentPos.y + agentH + CONFIG_BELOW_GAP,
  }
}

function mergeBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  x: number,
  y: number,
  size: Size,
) {
  bounds.minX = Math.min(bounds.minX, x)
  bounds.minY = Math.min(bounds.minY, y)
  bounds.maxX = Math.max(bounds.maxX, x + size.w)
  bounds.maxY = Math.max(bounds.maxY, y + size.h)
}

function boundsFromPositions(
  ids: string[],
  positions: Map<string, Point>,
  nodeById: Map<string, ProjectNode>,
): Rect | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const id of ids) {
    const node = nodeById.get(id)
    const pos = positions.get(id)
    if (!node || !pos) continue
    const fp = layoutFootprint(node)
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + fp.w)
    maxY = Math.max(maxY, pos.y + fp.h)
  }

  if (!Number.isFinite(minX)) return null
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

function translateIds(
  ids: string[],
  positions: Map<string, Point>,
  nodeById: Map<string, ProjectNode>,
  dx: number,
  dy: number,
) {
  for (const id of ids) {
    const node = nodeById.get(id)
    const pos = positions.get(id) ?? (node ? { x: node.x, y: node.y } : null)
    if (!pos) continue
    positions.set(id, { x: pos.x + dx, y: pos.y + dy })
  }
}

function fitStickyFrame(
  sticky: ProjectNode,
  memberIds: string[],
  positions: Map<string, Point>,
  nodeById: Map<string, ProjectNode>,
): { x: number; y: number; noteWidth: number; noteHeight: number } {
  const memberBounds = boundsFromPositions(memberIds, positions, nodeById)
  if (!memberBounds) {
    const pos = positions.get(sticky.id) ?? { x: sticky.x, y: sticky.y }
    return {
      x: pos.x,
      y: pos.y,
      noteWidth: sticky.noteWidth ?? STICKY_NOTE_DEFAULT_W,
      noteHeight: sticky.noteHeight ?? STICKY_NOTE_DEFAULT_H,
    }
  }

  const textLines = sticky.noteBody?.split('\n').filter((line) => line.trim()).length ?? 0
  const textReserve = Math.max(
    FRAME_TOP_TEXT_PAD,
    FRAME_TOP_TEXT_PAD + Math.max(0, textLines - 1) * FRAME_TOP_TEXT_LINE,
  )

  const x = memberBounds.x - FRAME_PAD
  const y = memberBounds.y - textReserve
  const w = Math.max(
    STICKY_NOTE_MIN_W,
    memberBounds.w + FRAME_PAD * 2,
    sticky.noteWidth ?? STICKY_NOTE_DEFAULT_W,
  )
  const h = Math.max(STICKY_NOTE_MIN_H, memberBounds.y + memberBounds.h - y + FRAME_PAD)

  return { x, y, noteWidth: Math.round(w), noteHeight: Math.round(h) }
}

function placeFrameGroup(
  group: StickyFrameGroup,
  anchorTarget: Point,
  nodeById: Map<string, ProjectNode>,
  positions: Map<string, Point>,
  stickySizes: Map<string, { noteWidth: number; noteHeight: number }>,
) {
  const anchor = nodeById.get(group.anchorId)
  const sticky = nodeById.get(group.stickyId)
  if (!anchor || !sticky) return

  const anchorPos = positions.get(group.anchorId) ?? { x: anchor.x, y: anchor.y }
  const dx = anchorTarget.x - anchorPos.x
  const dy = anchorTarget.y - anchorPos.y

  translateIds(group.memberIds, positions, nodeById, dx, dy)

  const stickyPos = positions.get(group.stickyId) ?? { x: sticky.x, y: sticky.y }
  positions.set(group.stickyId, { x: stickyPos.x + dx, y: stickyPos.y + dy })

  const fitted = fitStickyFrame(sticky, group.memberIds, positions, nodeById)
  positions.set(group.stickyId, { x: fitted.x, y: fitted.y })
  stickySizes.set(group.stickyId, { noteWidth: fitted.noteWidth, noteHeight: fitted.noteHeight })
}

function groupLayoutWidth(
  group: StickyFrameGroup,
  positions: Map<string, Point>,
  nodeById: Map<string, ProjectNode>,
  stickySizes: Map<string, { noteWidth: number; noteHeight: number }>,
): number {
  const ids = [group.stickyId, ...group.memberIds]
  const bounds = boundsFromPositions(ids, positions, nodeById)
  if (!bounds) return 0

  const stickySize = stickySizes.get(group.stickyId)
  const sticky = nodeById.get(group.stickyId)
  if (sticky && stickySize) {
    const pos = positions.get(group.stickyId) ?? { x: sticky.x, y: sticky.y }
    return Math.max(bounds.w, pos.x + stickySize.noteWidth - bounds.x)
  }
  return bounds.w
}

/** Left-to-right main flow; sticky frame groups move with their anchored nodes. */
export function applyFlowAutoLayout(project: ProjectDetail): ProjectNode[] {
  const nodeById = new Map(project.nodes.map((n) => [n.id, n]))
  const graph = createWorkflowGraph(project)
  const positions = new Map<string, { x: number; y: number }>()
  const stickySizes = new Map<string, { noteWidth: number; noteHeight: number }>()
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  const placed = new Set<string>()

  const mainOrder = graph.getMainPathOrder()
  const frameGroups = buildStickyFrameGroups(project, mainOrder)
  const groupByAnchor = new Map(frameGroups.map((g) => [g.anchorId, g]))
  const groupedStickyIds = new Set(frameGroups.map((g) => g.stickyId))
  const framedMemberIds = new Set(frameGroups.flatMap((g) => g.memberIds))

  let cursorX = ORIGIN_X
  const mainY = ORIGIN_Y

  for (const nodeId of mainOrder) {
    if (placed.has(nodeId)) continue

    const frameGroup = groupByAnchor.get(nodeId)
    if (frameGroup) {
      placeFrameGroup(frameGroup, { x: cursorX, y: mainY }, nodeById, positions, stickySizes)
      placed.add(frameGroup.stickyId)
      frameGroup.memberIds.forEach((id) => placed.add(id))

      const groupW = groupLayoutWidth(frameGroup, positions, nodeById, stickySizes)
      const groupIds = [frameGroup.stickyId, ...frameGroup.memberIds]
      for (const id of groupIds) {
        const node = nodeById.get(id)
        const pos = positions.get(id)
        if (!node || !pos) continue
        mergeBounds(bounds, pos.x, pos.y, layoutFootprint(node))
      }
      cursorX += groupW + MAIN_GAP
      continue
    }

    if (framedMemberIds.has(nodeId)) continue

    const node = nodeById.get(nodeId)
    if (!node) continue
    const fp = layoutFootprint(node)
    positions.set(nodeId, { x: cursorX, y: mainY })
    mergeBounds(bounds, cursorX, mainY, fp)
    placed.add(nodeId)
    cursorX += fp.w + MAIN_GAP
  }

  for (const node of project.nodes) {
    if (roleForKind(node.kind, node.role) !== 'agent') continue
    const agentPos = positions.get(node.id)
    if (!agentPos) continue

    const configEdges = graph.getConfigSources(node.id)
    for (const edge of configEdges) {
      const configNode = nodeById.get(edge.from)
      if (!configNode) continue
      const slot = resolveConfigSlot(edge, configEdges)
      const pos = configPosition(agentPos, slot)
      positions.set(edge.from, pos)
      mergeBounds(bounds, pos.x, pos.y, layoutFootprint(configNode))
      placed.add(edge.from)
    }
  }

  const ungroupedStickies = project.nodes.filter(
    (n) => roleForKind(n.kind, n.role) === 'note' && !groupedStickyIds.has(n.id),
  )
  if (ungroupedStickies.length > 0) {
    const anchorX =
      Number.isFinite(bounds.maxX) && bounds.maxX > ORIGIN_X
        ? bounds.maxX + MAIN_GAP
        : cursorX + MAIN_GAP
    let stickyY = mainY

    for (const sticky of ungroupedStickies) {
      const fp = layoutFootprint(sticky)
      positions.set(sticky.id, { x: anchorX, y: stickyY })
      mergeBounds(bounds, anchorX, stickyY, fp)
      stickyY += fp.h + ROW_GAP
      placed.add(sticky.id)
    }
  }

  const orphans = project.nodes.filter((node) => {
    if (placed.has(node.id)) return false
    return roleForKind(node.kind, node.role) !== 'note'
  })

  if (orphans.length > 0) {
    const orphanY = (Number.isFinite(bounds.maxY) ? bounds.maxY : mainY + 200) + ROW_GAP + 40
    let orphanX = ORIGIN_X
    for (const node of orphans) {
      const fp = layoutFootprint(node)
      positions.set(node.id, { x: orphanX, y: orphanY })
      orphanX += fp.w + MAIN_GAP
    }
  }

  return project.nodes.map((node) => {
    const pos = positions.get(node.id)
    const size = stickySizes.get(node.id)
    if (!pos) return node
    return {
      ...node,
      x: pos.x,
      y: pos.y,
      ...(size ? { noteWidth: size.noteWidth, noteHeight: size.noteHeight } : {}),
    }
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
