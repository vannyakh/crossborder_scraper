import type { ProjectNodeKind } from './project-sample-data'

export type ProjectPaletteCategory = 'workflow' | 'data' | 'deploy'

export type ProjectPaletteEntry = {
  kind: ProjectNodeKind
  labelKey: string
  descKey: string
  category: ProjectPaletteCategory
}

export const PROJECT_PALETTE_CATEGORIES: {
  id: ProjectPaletteCategory | 'all'
  labelKey: string
}[] = [
  { id: 'all', labelKey: 'projects.addNode.categories.all' },
  { id: 'workflow', labelKey: 'projects.addNode.categories.workflow' },
  { id: 'data', labelKey: 'projects.addNode.categories.data' },
  { id: 'deploy', labelKey: 'projects.addNode.categories.deploy' },
]

export const PROJECT_NODE_PALETTE: ProjectPaletteEntry[] = [
  {
    kind: 'webhook',
    labelKey: 'projects.nodes.webhook',
    descKey: 'projects.addNode.desc.webhook',
    category: 'workflow',
  },
  {
    kind: 'agent',
    labelKey: 'projects.nodes.agent',
    descKey: 'projects.addNode.desc.agent',
    category: 'workflow',
  },
  {
    kind: 'scrape',
    labelKey: 'projects.nodes.scrape',
    descKey: 'projects.addNode.desc.scrape',
    category: 'workflow',
  },
  {
    kind: 'postgres',
    labelKey: 'projects.nodes.postgres',
    descKey: 'projects.addNode.desc.postgres',
    category: 'data',
  },
  {
    kind: 'redis',
    labelKey: 'projects.nodes.redis',
    descKey: 'projects.addNode.desc.redis',
    category: 'data',
  },
  {
    kind: 'github',
    labelKey: 'projects.nodes.github',
    descKey: 'projects.addNode.desc.github',
    category: 'deploy',
  },
]

/** @deprecated Use PROJECT_NODE_PALETTE */
export const NODE_PALETTE = PROJECT_NODE_PALETTE.map(({ kind, labelKey }) => ({
  kind,
  labelKey,
}))
