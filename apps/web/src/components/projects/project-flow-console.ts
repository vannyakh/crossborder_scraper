import type { ProjectNode } from './project-sample-data'

export type FlowConsoleLevel = 'info' | 'warn' | 'error' | 'debug' | 'success'

export type FlowConsoleLine = {
  id: string
  at: number
  nodeId?: string
  nodeLabel?: string
  level: FlowConsoleLevel
  message: string
}

let lineSeq = 0

export function nextFlowConsoleLineId(): string {
  lineSeq += 1
  return `flow-log-${Date.now()}-${lineSeq}`
}

export function createFlowConsoleLine(
  message: string,
  level: FlowConsoleLevel = 'info',
  node?: Pick<ProjectNode, 'id' | 'label'>,
): FlowConsoleLine {
  return {
    id: nextFlowConsoleLineId(),
    at: Date.now(),
    nodeId: node?.id,
    nodeLabel: node?.label,
    level,
    message,
  }
}

export function formatFlowConsoleTime(at: number): string {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

function marketplaceLabel(node: ProjectNode): string {
  const value = node.options?.marketplace
  return value ? String(value) : '1688'
}

function exportTargetLabel(node: ProjectNode): string {
  const value = node.options?.exportTarget
  return value ? String(value) : 'shopee'
}

/** Preview log lines emitted when a flow step runs (mock until flow API is wired). */
export function buildNodeConsoleLines(
  node: ProjectNode,
  phase: 'config' | 'main' | 'single' = 'single',
): FlowConsoleLine[] {
  const base = { nodeId: node.id, nodeLabel: node.label }
  const mk = (message: string, level: FlowConsoleLevel = 'info'): FlowConsoleLine => ({
    id: nextFlowConsoleLineId(),
    at: Date.now(),
    ...base,
    level,
    message,
  })

  const phasePrefix =
    phase === 'config'
      ? `[config] ${node.label}`
      : phase === 'main'
        ? `[main] ${node.label}`
        : node.label

  switch (node.kind) {
    case 'agent':
      return [
        mk(`${phasePrefix} — loading skills and agent rules`),
        mk(`tool loop started · scope ${node.host ?? 'gateway-tools'}`, 'debug'),
        mk(`agent reply ready · ${node.subtitle ?? 'default skill'}`, 'success'),
      ]
    case 'scrape':
      return [
        mk(`${phasePrefix} — scrape job queued`),
        mk(`fetching catalog from ${marketplaceLabel(node)}`, 'debug'),
        mk('parsed 24 items · 0 warnings', 'success'),
      ]
    case 'export':
      return [
        mk(`${phasePrefix} — export batch started`),
        mk(`target marketplace: ${exportTargetLabel(node)}`, 'debug'),
        mk('uploaded 12 listings · 0 rejected', 'success'),
      ]
    case 'webhook':
      return [
        mk(`${phasePrefix} — inbound webhook received`),
        mk(`route ${node.host ?? '/integrate/webhook/inbound'}`, 'debug'),
        mk(
          node.options?.webhookActive === false
            ? 'webhook inactive — payload ignored'
            : 'payload validated',
          node.options?.webhookActive === false ? 'warn' : 'success',
        ),
      ]
    case 'schedule':
      return [
        mk(`${phasePrefix} — cron tick fired`),
        mk(`expression ${node.subtitle ?? '0 6 * * *'}`, 'debug'),
        mk('schedule handler completed', 'success'),
      ]
    case 'condition':
      return [
        mk(`${phasePrefix} — evaluating branch`),
        mk(`expression ${node.subtitle ?? 'items.length > 0'}`, 'debug'),
        mk('branch result: true → continue main path', 'success'),
      ]
    case 'notify':
      return [
        mk(`${phasePrefix} — deliver notification`),
        mk(`channel ${node.subtitle ?? 'telegram'}`, 'debug'),
        mk('message delivered', 'success'),
      ]
    case 'postgres':
      return [
        mk(`${phasePrefix} — opening connection pool`),
        mk(`host ${node.host ?? 'postgres.internal'}`, 'debug'),
        mk('query finished · 3 rows', 'success'),
      ]
    case 'redis':
      return [
        mk(`${phasePrefix} — cache read`),
        mk(`endpoint ${node.host ?? 'redis.internal'}`, 'debug'),
        mk('cache hit · session context loaded', 'success'),
      ]
    case 'github':
      return [
        mk(`${phasePrefix} — deploy hook received`),
        mk(`repo ${node.subtitle ?? 'cross-border/deploy'}`, 'debug'),
        mk('build artifact staged', 'success'),
      ]
    default:
      return [
        mk(`${phasePrefix} — step started`),
        mk('runtime preview · no backend attached', 'debug'),
        mk('step finished', 'success'),
      ]
  }
}
