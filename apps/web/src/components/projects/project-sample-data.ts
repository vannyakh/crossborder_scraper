/** Sample data for Projects UI — no API wiring yet. */

export type ProjectNodeKind = 'github' | 'redis' | 'postgres' | 'scrape' | 'agent' | 'webhook'

export type ProjectNodeRole = 'trigger' | 'action' | 'agent' | 'config'

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
}

export type ProjectEdgeKind = 'main' | 'config'

export type ProjectEdge = {
  id: string
  from: string
  to: string
  kind?: ProjectEdgeKind
}

export type ProjectEnvironment = 'production' | 'staging' | 'development'

export type ProjectSummary = {
  id: string
  name: string
  environment: ProjectEnvironment
  servicesOnline: number
  servicesTotal: number
  updatedAt: string
  previewNodes: ProjectNode[]
  previewEdges: ProjectEdge[]
}

export type ProjectDetail = ProjectSummary & {
  nodes: ProjectNode[]
  edges: ProjectEdge[]
}

const PREVIEW_A: ProjectNode[] = [
  { id: 'gh', kind: 'github', label: 'GitHub', x: 18, y: 22 },
  { id: 'pg', kind: 'postgres', label: 'Postgres', x: 52, y: 48 },
  { id: 'rd', kind: 'redis', label: 'Redis', x: 78, y: 18 },
]

const PREVIEW_B: ProjectNode[] = [
  { id: 'sc', kind: 'scrape', label: 'Scrape', x: 24, y: 30 },
  { id: 'ag', kind: 'agent', label: 'Agent', x: 58, y: 20 },
  { id: 'pg', kind: 'postgres', label: 'Postgres', x: 72, y: 52 },
]

export const SAMPLE_PROJECTS: ProjectDetail[] = [
  {
    id: 'tv-camtube',
    name: 'Tv CamTube',
    environment: 'production',
    servicesOnline: 2,
    servicesTotal: 6,
    updatedAt: '2026-05-28T14:20:00Z',
    previewNodes: PREVIEW_A,
    previewEdges: [
      { id: 'e1', from: 'gh', to: 'pg' },
      { id: 'e2', from: 'pg', to: 'rd' },
    ],
    nodes: [
      {
        id: 'n0',
        kind: 'webhook',
        role: 'trigger',
        label: 'On deploy hook',
        subtitle: 'webhook: deploy',
        x: 40,
        y: 200,
      },
      {
        id: 'n1',
        kind: 'agent',
        role: 'agent',
        label: 'Gateway agent',
        subtitle: 'Tools agent',
        detail: 'postgres-chat-memory',
        host: 'gateway-tools',
        status: 'online',
        x: 280,
        y: 180,
      },
      {
        id: 'n2',
        kind: 'postgres',
        role: 'config',
        label: 'Postgres',
        subtitle: 'postgres: catalog',
        x: 248,
        y: 400,
      },
      {
        id: 'n3',
        kind: 'redis',
        role: 'config',
        label: 'Redis',
        subtitle: 'redis: queue',
        x: 432,
        y: 400,
      },
      {
        id: 'n4',
        kind: 'scrape',
        role: 'action',
        label: 'Batch scrape',
        subtitle: 'scrape: catalog',
        status: 'online',
        x: 560,
        y: 180,
      },
      {
        id: 'n5',
        kind: 'github',
        role: 'action',
        label: 'CamTube',
        subtitle: 'www.tvcamtube.com',
        status: 'online',
        x: 760,
        y: 180,
      },
    ],
    edges: [
      { id: 'e1', from: 'n0', to: 'n1', kind: 'main' },
      { id: 'e2', from: 'n1', to: 'n4', kind: 'main' },
      { id: 'e3', from: 'n4', to: 'n5', kind: 'main' },
      { id: 'e4', from: 'n2', to: 'n1', kind: 'config' },
      { id: 'e5', from: 'n3', to: 'n1', kind: 'config' },
    ],
  },
  {
    id: 'vokler',
    name: 'Vokler',
    environment: 'production',
    servicesOnline: 5,
    servicesTotal: 5,
    updatedAt: '2026-05-27T09:10:00Z',
    previewNodes: PREVIEW_B,
    previewEdges: [
      { id: 'e1', from: 'sc', to: 'ag' },
      { id: 'e2', from: 'ag', to: 'pg' },
    ],
    nodes: [
      { id: 'n1', kind: 'scrape', label: '1688 ingest', x: 100, y: 140 },
      { id: 'n2', kind: 'postgres', label: 'Products', x: 340, y: 100 },
      { id: 'n3', kind: 'agent', label: 'Cron agent', x: 340, y: 260 },
      { id: 'n4', kind: 'redis', label: 'Cache', x: 560, y: 180 },
      { id: 'n5', kind: 'webhook', label: 'Telegram', x: 720, y: 120 },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' },
      { id: 'e3', from: 'n3', to: 'n4' },
      { id: 'e4', from: 'n4', to: 'n5' },
    ],
  },
  {
    id: 'reelxfb',
    name: 'ReelXfb',
    environment: 'production',
    servicesOnline: 0,
    servicesTotal: 3,
    updatedAt: '2026-05-20T18:00:00Z',
    previewNodes: [
      { id: 'sc', kind: 'scrape', label: 'Scrape', x: 30, y: 40 },
      { id: 'rd', kind: 'redis', label: 'Redis', x: 70, y: 24 },
    ],
    previewEdges: [{ id: 'e1', from: 'sc', to: 'rd' }],
    nodes: [
      { id: 'n1', kind: 'scrape', label: 'Export flow', x: 120, y: 120 },
      { id: 'n2', kind: 'redis', label: 'Queue', x: 360, y: 140 },
      { id: 'n3', kind: 'webhook', label: 'Webhook', x: 560, y: 100 },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' },
    ],
  },
  {
    id: 'xfans',
    name: 'Xfans',
    environment: 'production',
    servicesOnline: 0,
    servicesTotal: 5,
    updatedAt: '2026-05-15T11:30:00Z',
    previewNodes: [
      { id: 'gh', kind: 'github', label: 'GitHub', x: 40, y: 28 },
      { id: 'pg', kind: 'postgres', label: 'DB', x: 68, y: 50 },
    ],
    previewEdges: [{ id: 'e1', from: 'gh', to: 'pg' }],
    nodes: [
      { id: 'n1', kind: 'github', label: 'Deploy', x: 90, y: 90 },
      { id: 'n2', kind: 'postgres', label: 'Primary', x: 300, y: 70 },
      { id: 'n3', kind: 'redis', label: 'Sessions', x: 300, y: 220 },
      { id: 'n4', kind: 'agent', label: 'Agent hub', x: 520, y: 150 },
      { id: 'n5', kind: 'scrape', label: 'Catalog sync', x: 520, y: 280 },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n1', to: 'n3' },
      { id: 'e3', from: 'n2', to: 'n4' },
      { id: 'e4', from: 'n4', to: 'n5' },
    ],
  },
]

export function getSampleProject(id: string): ProjectDetail | undefined {
  return SAMPLE_PROJECTS.find((p) => p.id === id)
}

export { NODE_PALETTE } from './project-node-palette'
