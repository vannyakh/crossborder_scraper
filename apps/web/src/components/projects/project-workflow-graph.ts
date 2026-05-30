/**
 * Workflow graph model — inspired by connection-indexed workflow engines
 * (nodes + typed edges, parent/child traversal, structure validation).
 */

import { buildAgentConfigPorts } from './project-flow-layout'
import { roleForKind } from './project-node-meta'
import type { ProjectDetail, ProjectEdge, ProjectNode } from './project-sample-data'

export type WorkflowIssueSeverity = 'error' | 'warning'

export type WorkflowIssue = {
  id: string
  severity: WorkflowIssueSeverity
  messageKey: string
  messageParams?: Record<string, string>
  nodeId?: string
}

export type WorkflowSummary = {
  nodeCount: number
  mainEdgeCount: number
  configEdgeCount: number
  triggerCount: number
  agentCount: number
  configNodeCount: number
  orphanMainNodes: number
}

export type FlowExecutionStep = {
  nodeId: string
  phase: 'config' | 'main'
}

export class ProjectWorkflowGraph {
  readonly nodes: Map<string, ProjectNode>
  readonly mainEdges: ProjectEdge[]
  readonly configEdges: ProjectEdge[]

  constructor(readonly project: ProjectDetail) {
    this.nodes = new Map(project.nodes.map((n) => [n.id, n]))
    this.mainEdges = project.edges.filter((e) => (e.kind ?? 'main') === 'main')
    this.configEdges = project.edges.filter((e) => (e.kind ?? 'main') === 'config')
  }

  getNode(id: string): ProjectNode | undefined {
    return this.nodes.get(id)
  }

  /** Main-path children (downstream). */
  getMainChildren(nodeId: string): string[] {
    return this.mainEdges.filter((e) => e.from === nodeId).map((e) => e.to)
  }

  /** Main-path parents (upstream). */
  getMainParents(nodeId: string): string[] {
    return this.mainEdges.filter((e) => e.to === nodeId).map((e) => e.from)
  }

  /** Config plugins wired into an agent (ordered by slot). */
  getConfigSources(agentId: string): ProjectEdge[] {
    return this.configEdges
      .filter((e) => e.to === agentId)
      .sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99))
  }

  /** Nodes on the main execution path (excludes config circles). */
  get mainPathNodeIds(): Set<string> {
    return new Set(
      this.project.nodes
        .filter(
          (n) => roleForKind(n.kind, n.role) !== 'config' && roleForKind(n.kind, n.role) !== 'note',
        )
        .map((n) => n.id),
    )
  }

  /** Topological main-path order — triggers first, then downstream. */
  getMainPathOrder(): string[] {
    const mainIds = this.mainPathNodeIds
    const inDegree = new Map<string, number>()
    const adjacency = new Map<string, string[]>()

    for (const id of mainIds) {
      inDegree.set(id, 0)
      adjacency.set(id, [])
    }

    for (const edge of this.mainEdges) {
      if (!mainIds.has(edge.from) || !mainIds.has(edge.to)) continue
      adjacency.get(edge.from)?.push(edge.to)
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
    }

    const triggers = this.project.nodes
      .filter((n) => n.role === 'trigger' && mainIds.has(n.id))
      .map((n) => n.id)
    const roots =
      triggers.length > 0 ? triggers : [...mainIds].filter((id) => (inDegree.get(id) ?? 0) === 0)

    const queue = [...roots]
    const ordered: string[] = []
    const visited = new Set<string>()

    while (queue.length) {
      const id = queue.shift()!
      if (visited.has(id) || !mainIds.has(id)) continue
      visited.add(id)
      ordered.push(id)
      for (const next of adjacency.get(id) ?? []) {
        inDegree.set(next, (inDegree.get(next) ?? 1) - 1)
        if ((inDegree.get(next) ?? 0) <= 0) queue.push(next)
      }
    }

    for (const id of mainIds) {
      if (!visited.has(id)) ordered.push(id)
    }

    return ordered
  }

  /** Execution plan: config plugins before each agent, then main step. */
  getExecutionPlan(): FlowExecutionStep[] {
    const mainSteps = this.getMainPathOrder()
    const agentIds = new Set(
      this.project.nodes.filter((n) => roleForKind(n.kind, n.role) === 'agent').map((n) => n.id),
    )

    const steps: FlowExecutionStep[] = []
    for (const nodeId of mainSteps) {
      if (agentIds.has(nodeId)) {
        for (const edge of this.getConfigSources(nodeId)) {
          steps.push({ nodeId: edge.from, phase: 'config' })
        }
      }
      steps.push({ nodeId, phase: 'main' })
    }
    return steps
  }

  /** Structure checks similar to workflow validation in automation editors. */
  validate(): WorkflowIssue[] {
    const issues: WorkflowIssue[] = []
    const mainIds = this.mainPathNodeIds

    if (this.project.nodes.length === 0) {
      issues.push({
        id: 'empty',
        severity: 'warning',
        messageKey: 'projects.flowExplorer.issueEmpty',
      })
      return issues
    }

    const triggers = this.project.nodes.filter((n) => n.role === 'trigger')
    if (triggers.length === 0 && mainIds.size > 1) {
      issues.push({
        id: 'no-trigger',
        severity: 'warning',
        messageKey: 'projects.flowExplorer.issueNoTrigger',
      })
    }

    for (const node of this.project.nodes) {
      const role = roleForKind(node.kind, node.role)
      if (role === 'config' || role === 'note') continue
      const hasIn = this.getMainParents(node.id).length > 0
      const hasOut = this.getMainChildren(node.id).length > 0
      const isTrigger = role === 'trigger'

      if (!isTrigger && !hasIn && mainIds.size > 1) {
        issues.push({
          id: `orphan-${node.id}`,
          severity: 'warning',
          messageKey: 'projects.flowExplorer.issueOrphan',
          messageParams: { name: node.label },
          nodeId: node.id,
        })
      }

      if (role === 'action' && !hasOut && !hasIn) {
        issues.push({
          id: `isolated-${node.id}`,
          severity: 'warning',
          messageKey: 'projects.flowExplorer.issueIsolated',
          messageParams: { name: node.label },
          nodeId: node.id,
        })
      }
    }

    const configPorts = buildAgentConfigPorts(this.project)
    for (const [agentId, ports] of configPorts) {
      const agent = this.getNode(agentId)
      for (const port of ports) {
        if (port.required && !port.occupied) {
          issues.push({
            id: `slot-${agentId}-${port.slotIndex}`,
            severity: 'error',
            messageKey: 'projects.flowExplorer.issueMissingSlot',
            messageParams: {
              agent: agent?.label ?? agentId,
              slotKey: port.labelKey ?? 'projects.flow.slots.model',
            },
            nodeId: agentId,
          })
        }
      }
    }

    for (const edge of this.configEdges) {
      if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
        issues.push({
          id: `dangling-${edge.id}`,
          severity: 'error',
          messageKey: 'projects.flowExplorer.issueDanglingEdge',
        })
      }
    }

    return issues
  }

  getSummary(): WorkflowSummary {
    const mainIds = this.mainPathNodeIds
    let orphanMainNodes = 0
    for (const id of mainIds) {
      const node = this.getNode(id)
      if (!node || node.role === 'trigger') continue
      if (this.getMainParents(id).length === 0 && mainIds.size > 1) orphanMainNodes += 1
    }

    return {
      nodeCount: this.project.nodes.filter((n) => roleForKind(n.kind, n.role) !== 'note').length,
      mainEdgeCount: this.mainEdges.length,
      configEdgeCount: this.configEdges.length,
      triggerCount: this.project.nodes.filter((n) => n.role === 'trigger').length,
      agentCount: this.project.nodes.filter((n) => roleForKind(n.kind, n.role) === 'agent').length,
      configNodeCount: this.project.nodes.filter((n) => roleForKind(n.kind, n.role) === 'config')
        .length,
      orphanMainNodes,
    }
  }
}

export function createWorkflowGraph(project: ProjectDetail): ProjectWorkflowGraph {
  return new ProjectWorkflowGraph(project)
}

/** @deprecated Use ProjectWorkflowGraph.getMainPathOrder */
export function buildMainFlowSteps(project: ProjectDetail): string[] {
  return createWorkflowGraph(project).getMainPathOrder()
}

/** @deprecated Use ProjectWorkflowGraph.getExecutionPlan */
export function buildFlowExecutionPlan(project: ProjectDetail): FlowExecutionStep[] {
  return createWorkflowGraph(project).getExecutionPlan()
}

export function agentConfigNodeIds(project: ProjectDetail, agentId: string): string[] {
  return createWorkflowGraph(project)
    .getConfigSources(agentId)
    .map((e) => e.from)
}

export { buildAgentConfigPorts }
