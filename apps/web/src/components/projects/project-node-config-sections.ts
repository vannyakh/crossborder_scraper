import type { ProjectNode, ProjectNodeKind } from './project-sample-data'

export type ProjectConfigTabId =
  | 'parameters'
  | 'source'
  | 'network'
  | 'variables'
  | 'settings'
  | 'export'

export type ProjectConfigSectionId =
  | 'trigger'
  | 'source'
  | 'networking'
  | 'scale'
  | 'deploy'
  | 'model'
  | 'memory'
  | 'tools'
  | 'scrape'
  | 'export'
  | 'danger'
  | 'overview'

export type ProjectConfigFieldType = 'text' | 'mono' | 'url' | 'image' | 'hint'

export type ProjectConfigField = {
  id: string
  labelKey: string
  type: ProjectConfigFieldType
  /** Resolve from node field or built-in resolver id */
  resolve: 'label' | 'subtitle' | 'host' | 'detail' | 'id' | 'kind' | 'role' | 'status' | 'image'
}

export type ProjectConfigTab = {
  id: ProjectConfigTabId
  labelKey: string
}

export type ProjectConfigSection = {
  id: ProjectConfigSectionId
  labelKey: string
  tab: ProjectConfigTabId
  fields: ProjectConfigField[]
}

export type NodeConfigSchema = {
  defaultTab: ProjectConfigTabId
  tabs: ProjectConfigTab[]
  sections: ProjectConfigSection[]
}

function schema(
  defaultTab: ProjectConfigTabId,
  tabs: ProjectConfigTab[],
  sections: ProjectConfigSection[],
): NodeConfigSchema {
  return { defaultTab, tabs, sections }
}

const REDIS_SCHEMA = schema(
  'source',
  [
    { id: 'source', labelKey: 'projects.config.tabs.source' },
    { id: 'network', labelKey: 'projects.config.tabs.network' },
    { id: 'variables', labelKey: 'projects.config.tabs.variables' },
    { id: 'settings', labelKey: 'projects.config.tabs.settings' },
  ],
  [
    {
      id: 'source',
      labelKey: 'projects.config.sections.source',
      tab: 'source',
      fields: [
        { id: 'img', labelKey: 'projects.config.sourceImage', type: 'image', resolve: 'image' },
        { id: 'vol', labelKey: 'projects.config.fields.volume', type: 'mono', resolve: 'detail' },
      ],
    },
    {
      id: 'networking',
      labelKey: 'projects.config.sections.networking',
      tab: 'network',
      fields: [
        {
          id: 'url',
          labelKey: 'projects.config.publicNetworking',
          type: 'url',
          resolve: 'host',
        },
      ],
    },
    {
      id: 'scale',
      labelKey: 'projects.config.sections.scale',
      tab: 'source',
      fields: [
        {
          id: 'replicas',
          labelKey: 'projects.config.fields.replicas',
          type: 'text',
          resolve: 'subtitle',
        },
      ],
    },
    {
      id: 'danger',
      labelKey: 'projects.config.sections.danger',
      tab: 'settings',
      fields: [
        {
          id: 'hint',
          labelKey: 'projects.config.dangerHint',
          type: 'hint',
          resolve: 'label',
        },
      ],
    },
  ],
)

const POSTGRES_SCHEMA = schema(
  'source',
  [
    { id: 'source', labelKey: 'projects.config.tabs.source' },
    { id: 'network', labelKey: 'projects.config.tabs.network' },
    { id: 'settings', labelKey: 'projects.config.tabs.settings' },
  ],
  [
    {
      id: 'source',
      labelKey: 'projects.config.sections.source',
      tab: 'source',
      fields: [
        { id: 'img', labelKey: 'projects.config.sourceImage', type: 'image', resolve: 'image' },
        { id: 'vol', labelKey: 'projects.config.fields.volume', type: 'mono', resolve: 'detail' },
      ],
    },
    {
      id: 'networking',
      labelKey: 'projects.config.sections.networking',
      tab: 'network',
      fields: [
        { id: 'host', labelKey: 'projects.config.fields.host', type: 'mono', resolve: 'host' },
      ],
    },
    {
      id: 'danger',
      labelKey: 'projects.config.sections.danger',
      tab: 'settings',
      fields: [
        { id: 'hint', labelKey: 'projects.config.dangerHint', type: 'hint', resolve: 'label' },
      ],
    },
  ],
)

const AGENT_SCHEMA = schema(
  'parameters',
  [
    { id: 'parameters', labelKey: 'projects.config.tabs.parameters' },
    { id: 'settings', labelKey: 'projects.config.tabs.settings' },
  ],
  [
    {
      id: 'model',
      labelKey: 'projects.config.sections.model',
      tab: 'parameters',
      fields: [
        {
          id: 'agent',
          labelKey: 'projects.config.fields.agentType',
          type: 'text',
          resolve: 'subtitle',
        },
        { id: 'name', labelKey: 'projects.config.fields.name', type: 'text', resolve: 'label' },
      ],
    },
    {
      id: 'memory',
      labelKey: 'projects.config.sections.memory',
      tab: 'parameters',
      fields: [
        {
          id: 'store',
          labelKey: 'projects.config.fields.memoryStore',
          type: 'mono',
          resolve: 'detail',
        },
      ],
    },
    {
      id: 'tools',
      labelKey: 'projects.config.sections.tools',
      tab: 'parameters',
      fields: [
        {
          id: 'tools',
          labelKey: 'projects.config.fields.toolScope',
          type: 'hint',
          resolve: 'host',
        },
      ],
    },
  ],
)

const WEBHOOK_SCHEMA = schema(
  'parameters',
  [
    { id: 'parameters', labelKey: 'projects.config.tabs.parameters' },
    { id: 'settings', labelKey: 'projects.config.tabs.settings' },
  ],
  [
    {
      id: 'trigger',
      labelKey: 'projects.config.sections.trigger',
      tab: 'parameters',
      fields: [
        {
          id: 'event',
          labelKey: 'projects.config.fields.event',
          type: 'mono',
          resolve: 'subtitle',
        },
        {
          id: 'path',
          labelKey: 'projects.config.fields.webhookPath',
          type: 'mono',
          resolve: 'host',
        },
      ],
    },
  ],
)

const SCRAPE_SCHEMA = schema(
  'parameters',
  [
    { id: 'parameters', labelKey: 'projects.config.tabs.parameters' },
    { id: 'export', labelKey: 'projects.config.tabs.export' },
  ],
  [
    {
      id: 'scrape',
      labelKey: 'projects.config.sections.scrape',
      tab: 'parameters',
      fields: [
        {
          id: 'source',
          labelKey: 'projects.config.fields.source',
          type: 'mono',
          resolve: 'subtitle',
        },
        { id: 'status', labelKey: 'projects.serviceStatus', type: 'text', resolve: 'status' },
      ],
    },
    {
      id: 'export',
      labelKey: 'projects.config.sections.export',
      tab: 'export',
      fields: [
        {
          id: 'target',
          labelKey: 'projects.config.fields.exportTarget',
          type: 'mono',
          resolve: 'host',
        },
      ],
    },
  ],
)

const GITHUB_SCHEMA = schema(
  'source',
  [
    { id: 'source', labelKey: 'projects.config.tabs.source' },
    { id: 'network', labelKey: 'projects.config.tabs.network' },
    { id: 'settings', labelKey: 'projects.config.tabs.settings' },
  ],
  [
    {
      id: 'source',
      labelKey: 'projects.config.sections.source',
      tab: 'source',
      fields: [
        {
          id: 'repo',
          labelKey: 'projects.config.fields.repository',
          type: 'mono',
          resolve: 'host',
        },
        {
          id: 'branch',
          labelKey: 'projects.config.fields.branch',
          type: 'mono',
          resolve: 'subtitle',
        },
      ],
    },
    {
      id: 'deploy',
      labelKey: 'projects.config.sections.deploy',
      tab: 'source',
      fields: [
        { id: 'img', labelKey: 'projects.config.sourceImage', type: 'image', resolve: 'image' },
      ],
    },
    {
      id: 'networking',
      labelKey: 'projects.config.sections.networking',
      tab: 'network',
      fields: [
        { id: 'url', labelKey: 'projects.config.fields.siteUrl', type: 'url', resolve: 'host' },
      ],
    },
  ],
)

const GENERIC_ACTION_SCHEMA = schema(
  'parameters',
  [{ id: 'parameters', labelKey: 'projects.config.tabs.parameters' }],
  [
    {
      id: 'overview',
      labelKey: 'projects.config.sections.overview',
      tab: 'parameters',
      fields: [
        { id: 'id', labelKey: 'projects.inspectorId', type: 'mono', resolve: 'id' },
        { id: 'kind', labelKey: 'projects.inspectorType', type: 'text', resolve: 'kind' },
        { id: 'sub', labelKey: 'projects.nodeSubtitle', type: 'mono', resolve: 'subtitle' },
      ],
    },
  ],
)

const SCHEMA_BY_KIND: Record<ProjectNodeKind, NodeConfigSchema> = {
  redis: REDIS_SCHEMA,
  postgres: POSTGRES_SCHEMA,
  agent: AGENT_SCHEMA,
  webhook: WEBHOOK_SCHEMA,
  scrape: SCRAPE_SCHEMA,
  github: GITHUB_SCHEMA,
}

export function getNodeConfigSchema(node: ProjectNode): NodeConfigSchema {
  if (node.role === 'config') {
    return SCHEMA_BY_KIND[node.kind] ?? REDIS_SCHEMA
  }
  return SCHEMA_BY_KIND[node.kind] ?? GENERIC_ACTION_SCHEMA
}

export function configSectionsForTab(
  schemaDef: NodeConfigSchema,
  tab: ProjectConfigTabId,
): ProjectConfigSection[] {
  return schemaDef.sections.filter((s) => s.tab === tab)
}

export function defaultImageForKind(kind: ProjectNodeKind): string {
  switch (kind) {
    case 'redis':
      return 'redis:8.2.1'
    case 'postgres':
      return 'postgres:16-alpine'
    case 'github':
      return 'ghcr.io/cross-border/deploy:latest'
    case 'scrape':
      return 'cross-border/scrape-engine:latest'
    case 'agent':
      return 'cross-border/gateway-agent:latest'
    case 'webhook':
      return 'cross-border/webhook-receiver:latest'
    default:
      return 'cross-border/runtime:latest'
  }
}

export function resolveFieldValue(
  node: ProjectNode,
  field: ProjectConfigField,
  t: (key: string) => string,
): string {
  switch (field.resolve) {
    case 'label':
      return node.label
    case 'subtitle':
      return node.subtitle ?? '—'
    case 'host':
      return node.host ?? '—'
    case 'detail':
      return node.detail ?? '—'
    case 'id':
      return node.id
    case 'kind':
      return node.kind
    case 'role':
      return node.role ?? '—'
    case 'status':
      return node.status === 'offline' ? t('projects.serviceOffline') : t('projects.serviceOnline')
    case 'image':
      return defaultImageForKind(node.kind)
    default:
      return '—'
  }
}

export function publicUrlForNode(node: ProjectNode): string {
  if (!node.host || node.host === '—') {
    return `${node.label.toLowerCase().replace(/\s+/g, '-')}.preview.local`
  }
  return node.host.startsWith('http') ? node.host : `https://${node.host}`
}
