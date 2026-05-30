import { createProjectNode } from './project-node-factory'
import type {
  ProjectDetail,
  ProjectEdge,
  ProjectEnvironment,
  ProjectNode,
} from './project-sample-data'

function countServiceHealth(nodes: ProjectNode[]): { online: number; total: number } {
  const services = nodes.filter((n) => n.role !== 'config' && n.role !== 'trigger')
  const withStatus = services.filter((n) => n.status !== undefined)
  if (withStatus.length === 0) {
    return { online: 0, total: services.length }
  }
  return {
    online: withStatus.filter((n) => n.status === 'online').length,
    total: withStatus.length,
  }
}

/** Mini canvas preview from the main flow path (up to four steps). */
function buildPreview(
  nodes: ProjectNode[],
  edges: ProjectEdge[],
): {
  previewNodes: ProjectNode[]
  previewEdges: ProjectEdge[]
} {
  const mainEdges = edges.filter((e) => (e.kind ?? 'main') === 'main')
  const flowNodes = nodes.filter((n) => n.role !== 'config')
  const incoming = new Set(mainEdges.map((e) => e.to))
  const roots = flowNodes.filter((n) => !incoming.has(n.id))
  const start = roots.find((n) => n.role === 'trigger') ?? roots[0] ?? flowNodes[0]
  if (!start) {
    return { previewNodes: [], previewEdges: [] }
  }

  const path: ProjectNode[] = [start]
  let cursor = start.id
  while (path.length < 4) {
    const nextEdge = mainEdges.find((e) => e.from === cursor)
    if (!nextEdge) break
    const nextNode = flowNodes.find((n) => n.id === nextEdge.to)
    if (!nextNode || path.some((n) => n.id === nextNode.id)) break
    path.push(nextNode)
    cursor = nextNode.id
  }

  const slots = [
    { x: 18, y: 22 },
    { x: 42, y: 48 },
    { x: 66, y: 22 },
    { x: 82, y: 48 },
  ]
  const idMap = new Map<string, string>()
  const previewNodes = path.map((node, index) => {
    const pid = `pv-${index}`
    idMap.set(node.id, pid)
    const slot = slots[index] ?? slots[slots.length - 1]
    return { ...node, id: pid, x: slot.x, y: slot.y }
  })
  const previewEdges = mainEdges
    .filter((e) => idMap.has(e.from) && idMap.has(e.to))
    .map((e, index) => ({
      id: `pv-e${index + 1}`,
      from: idMap.get(e.from)!,
      to: idMap.get(e.to)!,
    }))

  return { previewNodes, previewEdges }
}

function finalizeProject(
  draft: Omit<ProjectDetail, 'servicesOnline' | 'servicesTotal' | 'previewNodes' | 'previewEdges'>,
): ProjectDetail {
  const health = countServiceHealth(draft.nodes)
  const preview = buildPreview(draft.nodes, draft.edges)
  return {
    ...draft,
    servicesOnline: health.online,
    servicesTotal: health.total,
    ...preview,
  }
}

const CATALOG_PIPELINE_NODES: ProjectNode[] = [
  {
    id: 'cp-note-welcome',
    kind: 'sticky',
    role: 'note',
    label: 'Workflow ready',
    noteBody:
      '✅ This demo workflow is ready to use\n✨ Supports **markdown**, *italic*, and lists',
    noteColor: 'purple',
    noteWidth: 300,
    noteHeight: 120,
    x: 40,
    y: 24,
  },
  {
    id: 'cp-schedule',
    kind: 'schedule',
    role: 'trigger',
    label: 'Daily catalog sync',
    subtitle: 'cron: 0 6 * * *',
    status: 'online',
    x: 40,
    y: 200,
  },
  {
    id: 'cp-agent',
    kind: 'agent',
    role: 'agent',
    label: 'Gateway agent',
    subtitle: 'scrape-assistant',
    detail: 'postgres-catalog',
    host: 'gateway-tools',
    status: 'online',
    agentPrompt:
      'Review scraped catalog items and summarize changes for export.\nUse **batch-ops** when the operator asks for bulk actions.',
    x: 280,
    y: 180,
  },
  {
    id: 'cp-scrape',
    kind: 'scrape',
    role: 'action',
    label: 'Batch scrape',
    subtitle: '1688 · taobao',
    status: 'online',
    options: { marketplace: 'both' },
    x: 560,
    y: 180,
  },
  {
    id: 'cp-export',
    kind: 'export',
    role: 'action',
    label: 'Export listings',
    subtitle: 'shopee · lazada',
    host: 'export-review',
    status: 'online',
    options: { exportTarget: 'both' },
    x: 800,
    y: 180,
  },
  {
    id: 'cp-model',
    kind: 'agent',
    role: 'config',
    label: 'Gateway LLM',
    subtitle: 'openai: gpt-4o',
    x: 120,
    y: 400,
  },
  {
    id: 'cp-postgres',
    kind: 'postgres',
    role: 'config',
    label: 'Postgres',
    subtitle: 'postgres: catalog',
    host: 'postgres.internal',
    detail: 'catalog-db volume',
    status: 'online',
    x: 280,
    y: 400,
  },
  {
    id: 'cp-redis',
    kind: 'redis',
    role: 'config',
    label: 'Redis',
    subtitle: 'redis: queue',
    host: 'redis.internal',
    detail: '1/1 replicas active',
    status: 'online',
    x: 440,
    y: 400,
  },
]

const CATALOG_PIPELINE_EDGES: ProjectEdge[] = [
  { id: 'cp-e1', from: 'cp-schedule', to: 'cp-agent', kind: 'main' },
  { id: 'cp-e2', from: 'cp-agent', to: 'cp-scrape', kind: 'main' },
  { id: 'cp-e3', from: 'cp-scrape', to: 'cp-export', kind: 'main' },
  { id: 'cp-e4', from: 'cp-model', to: 'cp-agent', kind: 'config', slotIndex: 0 },
  { id: 'cp-e5', from: 'cp-postgres', to: 'cp-agent', kind: 'config', slotIndex: 1 },
  { id: 'cp-e6', from: 'cp-redis', to: 'cp-agent', kind: 'config', slotIndex: 2 },
]

const TELEGRAM_OPS_NODES: ProjectNode[] = [
  {
    id: 'to-webhook',
    kind: 'webhook',
    role: 'trigger',
    label: 'Telegram control chat',
    subtitle: 'integrate: telegram',
    host: '/integrate/telegram/inbound',
    status: 'online',
    options: { webhookActive: true },
    x: 40,
    y: 200,
  },
  {
    id: 'to-agent',
    kind: 'agent',
    role: 'agent',
    label: 'Gateway agent',
    subtitle: 'agent-control',
    detail: 'postgres-chat-memory',
    host: 'gateway-tools',
    status: 'online',
    x: 300,
    y: 180,
  },
  {
    id: 'to-notify',
    kind: 'notify',
    role: 'action',
    label: 'Send summary',
    subtitle: 'telegram: ops-chat',
    host: 'integrate-notify',
    status: 'online',
    x: 580,
    y: 180,
  },
  {
    id: 'to-model',
    kind: 'agent',
    role: 'config',
    label: 'Gateway LLM',
    subtitle: 'openai: gpt-4o-mini',
    x: 140,
    y: 400,
  },
  {
    id: 'to-postgres',
    kind: 'postgres',
    role: 'config',
    label: 'Postgres',
    subtitle: 'postgres: sessions',
    host: 'postgres.internal',
    detail: 'chat-memory volume',
    status: 'online',
    x: 300,
    y: 400,
  },
  {
    id: 'to-redis',
    kind: 'redis',
    role: 'config',
    label: 'Redis',
    subtitle: 'redis: rate-limit',
    host: 'redis.internal',
    detail: '1/1 replicas active',
    status: 'online',
    x: 460,
    y: 400,
  },
]

const TELEGRAM_OPS_EDGES: ProjectEdge[] = [
  { id: 'to-e1', from: 'to-webhook', to: 'to-agent', kind: 'main' },
  { id: 'to-e2', from: 'to-agent', to: 'to-notify', kind: 'main' },
  { id: 'to-e3', from: 'to-model', to: 'to-agent', kind: 'config', slotIndex: 0 },
  { id: 'to-e4', from: 'to-postgres', to: 'to-agent', kind: 'config', slotIndex: 1 },
  { id: 'to-e5', from: 'to-redis', to: 'to-agent', kind: 'config', slotIndex: 2 },
]

const STAGING_INGEST_NODES: ProjectNode[] = [
  {
    id: 'si-scrape',
    kind: 'scrape',
    role: 'action',
    label: '1688 ingest',
    subtitle: '1688: category-feed',
    status: 'offline',
    x: 80,
    y: 180,
  },
  {
    id: 'si-condition',
    kind: 'condition',
    role: 'action',
    label: 'Catalog threshold',
    subtitle: 'if count > 100',
    status: 'online',
    x: 320,
    y: 180,
  },
  {
    id: 'si-agent',
    kind: 'agent',
    role: 'agent',
    label: 'Gateway agent',
    subtitle: 'batch-ops',
    host: 'gateway-tools',
    status: 'online',
    x: 560,
    y: 180,
  },
  {
    id: 'si-postgres',
    kind: 'postgres',
    role: 'config',
    label: 'Postgres',
    subtitle: 'postgres: staging',
    host: 'postgres.internal',
    detail: 'staging-db volume',
    status: 'online',
    x: 520,
    y: 400,
  },
  {
    id: 'si-github',
    kind: 'github',
    role: 'action',
    label: 'Deploy hook',
    subtitle: 'main branch',
    host: 'github.com/cross-border/staging',
    status: 'offline',
    x: 800,
    y: 180,
  },
]

const STAGING_INGEST_EDGES: ProjectEdge[] = [
  { id: 'si-e1', from: 'si-scrape', to: 'si-condition', kind: 'main' },
  { id: 'si-e2', from: 'si-condition', to: 'si-agent', kind: 'main' },
  { id: 'si-e3', from: 'si-agent', to: 'si-github', kind: 'main' },
  { id: 'si-e4', from: 'si-postgres', to: 'si-agent', kind: 'config', slotIndex: 1 },
]

export const SAMPLE_PROJECTS: ProjectDetail[] = [
  finalizeProject({
    id: 'catalog-pipeline',
    name: 'Catalog pipeline',
    environment: 'production',
    updatedAt: '2026-05-28T14:20:00Z',
    description: 'Scheduled scrape, agent review, and marketplace export for the product catalog.',
    nodes: CATALOG_PIPELINE_NODES,
    edges: CATALOG_PIPELINE_EDGES,
  }),
  finalizeProject({
    id: 'telegram-ops',
    name: 'Telegram ops',
    environment: 'production',
    updatedAt: '2026-05-27T09:10:00Z',
    description: 'Control chat for gateway agent — schedules, health checks, and operator alerts.',
    nodes: TELEGRAM_OPS_NODES,
    edges: TELEGRAM_OPS_EDGES,
  }),
  finalizeProject({
    id: 'staging-ingest',
    name: 'Staging ingest',
    environment: 'staging',
    updatedAt: '2026-05-20T18:00:00Z',
    description: 'Partial staging flow — missing model slot and one offline scrape step.',
    nodes: STAGING_INGEST_NODES,
    edges: STAGING_INGEST_EDGES,
  }),
]

export function getSampleProject(id: string): ProjectDetail | undefined {
  return SAMPLE_PROJECTS.find((p) => p.id === id)
}

/** Blank project with a schedule trigger and gateway agent starter flow. */
export function createStarterProject(name: string, environment: ProjectEnvironment): ProjectDetail {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  const id = `${slug}-${Date.now().toString(36).slice(-4)}`

  const schedule = createProjectNode('schedule', 'New schedule', [])
  schedule.x = 120
  schedule.y = 160

  const agent = createProjectNode('agent', 'Gateway agent', [schedule])
  agent.x = 360
  agent.y = 160

  const nodes = [schedule, agent]
  const edges: ProjectEdge[] = [{ id: 'e-start', from: schedule.id, to: agent.id, kind: 'main' }]

  return finalizeProject({
    id,
    name,
    environment,
    updatedAt: new Date().toISOString(),
    description: '',
    nodes,
    edges,
  })
}

/** Service labels for logs and runtime charts derived from flow nodes. */
export function projectServiceNames(project: ProjectDetail): string[] {
  return project.nodes
    .filter((n) => n.role !== 'config')
    .map((n) => n.subtitle?.split(':').pop()?.trim() || n.label)
    .slice(0, 5)
}
