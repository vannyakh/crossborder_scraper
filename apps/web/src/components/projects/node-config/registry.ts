import type { PluginProfile } from '../../../lib/api/types'
import {
  profileToNodeSchema,
  resolveProfileForNode,
} from '../../../lib/plugin-profiles/resolve-schema'
import type { ProjectNode, ProjectNodeKind, ProjectDetail } from '../project-sample-data'
import type { NodeConfigSchema, ProjectConfigField, ProjectConfigTabId } from './types'

import agentSchema from './schemas/agent.json'
import conditionSchema from './schemas/condition.json'
import defaultSchema from './schemas/default.json'
import exportSchema from './schemas/export.json'
import githubSchema from './schemas/github.json'
import notifySchema from './schemas/notify.json'
import postgresSchema from './schemas/postgres.json'
import redisSchema from './schemas/redis.json'
import scheduleSchema from './schemas/schedule.json'
import scrapeSchema from './schemas/scrape.json'
import webhookSchema from './schemas/webhook.json'

const SCHEMA_BY_KIND: Record<string, NodeConfigSchema> = {
  agent: agentSchema as NodeConfigSchema,
  postgres: postgresSchema as NodeConfigSchema,
  redis: redisSchema as NodeConfigSchema,
  webhook: webhookSchema as NodeConfigSchema,
  scrape: scrapeSchema as NodeConfigSchema,
  schedule: scheduleSchema as NodeConfigSchema,
  export: exportSchema as NodeConfigSchema,
  condition: conditionSchema as NodeConfigSchema,
  notify: notifySchema as NodeConfigSchema,
  github: githubSchema as NodeConfigSchema,
  default: defaultSchema as NodeConfigSchema,
}

export function getNodeConfigSchema(
  node: ProjectNode,
  ctx?: { project?: ProjectDetail; profiles?: PluginProfile[] },
): NodeConfigSchema {
  if (ctx?.project && ctx.profiles?.length) {
    const profile = resolveProfileForNode(ctx.project, node, ctx.profiles)
    if (profile) return profileToNodeSchema(profile)
  }
  if (node.role === 'config') {
    return SCHEMA_BY_KIND[node.kind] ?? SCHEMA_BY_KIND.redis
  }
  return SCHEMA_BY_KIND[node.kind] ?? SCHEMA_BY_KIND.default
}

export function configSectionsForTab(schema: NodeConfigSchema, tab: ProjectConfigTabId) {
  return schema.sections.filter((s) => s.tab === tab)
}

export function countSchemaFields(schema: NodeConfigSchema): number {
  return schema.sections.reduce((sum, section) => sum + section.fields.length, 0)
}

export function isFieldEditable(field: ProjectConfigField): boolean {
  return Boolean(field.editable && (field.bind || field.optionKey))
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
    case 'schedule':
      return 'cross-border/scheduler:latest'
    case 'export':
      return 'cross-border/export-engine:latest'
    case 'condition':
      return 'cross-border/flow-runtime:latest'
    case 'notify':
      return 'cross-border/integrate-notify:latest'
    default:
      return 'cross-border/runtime:latest'
  }
}

export function resolveFieldValue(
  node: ProjectNode,
  field: ProjectConfigField,
  t: (key: string) => string,
): string {
  if (isFieldEditable(field)) {
    const live = readFieldValue(node, field)
    if (live !== undefined && live !== null && String(live) !== '') {
      return String(live)
    }
  }

  if (field.resolve) {
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
        return node.status === 'offline'
          ? t('projects.serviceOffline')
          : t('projects.serviceOnline')
      case 'image':
        return defaultImageForKind(node.kind)
      default:
        return '—'
    }
  }

  const raw = readFieldValue(node, field)
  if (raw === undefined || raw === null || raw === '') return '—'
  return String(raw)
}

export function readFieldValue(
  node: ProjectNode,
  field: ProjectConfigField,
): string | boolean | undefined {
  if (field.optionKey) {
    const value = node.options?.[field.optionKey]
    if (typeof value === 'boolean') return value
    return value !== undefined ? String(value) : undefined
  }
  if (field.bind) {
    const value = node[field.bind as keyof ProjectNode]
    if (typeof value === 'boolean') return value
    return value !== undefined ? String(value) : undefined
  }
  return undefined
}

export function readToggleValue(node: ProjectNode, field: ProjectConfigField): boolean {
  const raw = readFieldValue(node, field)
  if (typeof raw === 'boolean') return raw
  if (raw === 'true') return true
  if (raw === 'false') return false
  return false
}

export function patchNodeFromField(
  node: ProjectNode,
  field: ProjectConfigField,
  value: string | boolean,
): ProjectNode {
  if (field.optionKey) {
    return {
      ...node,
      options: {
        ...node.options,
        [field.optionKey]: value,
      },
    }
  }
  if (field.bind) {
    return { ...node, [field.bind]: typeof value === 'string' ? value : value } as ProjectNode
  }
  return node
}

export function publicUrlForNode(node: ProjectNode): string {
  const host = node.host?.trim()
  if (!host || host === '—') {
    return `${node.label.toLowerCase().replace(/\s+/g, '-')}.preview.local`
  }
  return host.startsWith('http') ? host : `https://${host}`
}

export type {
  NodeConfigSchema,
  ProjectConfigField,
  ProjectConfigSection,
  ProjectConfigTabId,
} from './types'
