import type { PluginProfile, PluginProfileField } from '../api/types'
import type { ProjectDetail, ProjectNode } from '../../components/projects/project-sample-data'
import {
  resolveConfigNodeSlot,
  resolveSubNodeProfile,
} from '../../components/projects/project-subnode-config'
import type {
  NodeConfigSchema,
  ProjectConfigField,
  ProjectConfigTabId,
} from '../../components/projects/node-config/types'

const PROFILE_TAB_LABEL_KEYS: Record<string, string> = {
  parameters: 'projects.config.tabs.parameters',
  source: 'projects.config.tabs.source',
  variables: 'projects.config.tabs.variables',
  settings: 'projects.config.tabs.settings',
  export: 'projects.config.tabs.export',
  output: 'projects.config.tabs.output',
}

function mapFieldType(type: PluginProfileField['type']): ProjectConfigField['type'] {
  switch (type) {
    case 'textarea':
      return 'textarea'
    case 'mono':
      return 'mono'
    case 'url':
      return 'url'
    case 'toggle':
      return 'toggle'
    case 'select':
      return 'select'
    case 'llm_provider':
      return 'llm_provider'
    case 'llm_model':
      return 'llm_model'
    case 'source_plugin':
      return 'source_plugin'
    case 'variable_key':
      return 'variable_key'
    default:
      return 'text'
  }
}

function mapProfileField(field: PluginProfileField): ProjectConfigField {
  const mapped: ProjectConfigField = {
    id: field.id,
    labelKey: `pluginProfile.field.${field.key}`,
    labelText: field.label,
    type: mapFieldType(field.type),
    editable: !field.resolve,
  }
  if (field.bind) {
    mapped.bind = field.bind
  } else if (!field.resolve) {
    mapped.optionKey = field.key
  }
  if (field.resolve) {
    mapped.resolve = field.resolve
  }
  if (field.placeholder) {
    mapped.placeholderText = field.placeholder
  }
  if (field.hint) {
    mapped.hintText = field.hint
  }
  if (field.rows) {
    mapped.rows = field.rows
  }
  if (field.options?.length) {
    mapped.options = field.options.map((opt) => ({
      value: opt.value,
      labelKey: `pluginProfile.option.${field.key}.${opt.value}`,
      label: opt.label,
    }))
  }
  return mapped
}

export function profileToNodeSchema(profile: PluginProfile): NodeConfigSchema {
  const defaultTab = (profile.tabs[0]?.id ?? 'parameters') as ProjectConfigTabId
  return {
    defaultTab,
    parametersLayout: profile.parameters_layout ?? undefined,
    tabs: profile.tabs.map((tab) => ({
      id: tab.id as ProjectConfigTabId,
      labelKey: PROFILE_TAB_LABEL_KEYS[tab.id] ?? 'projects.config.tabs.parameters',
    })),
    sections: profile.sections.map((section) => ({
      id: section.id as NodeConfigSchema['sections'][number]['id'],
      labelKey: `pluginProfile.section.${section.id}`,
      labelText: section.label,
      tab: section.tab as ProjectConfigTabId,
      fields: section.fields.map(mapProfileField),
    })),
  }
}

export function resolvePluginProfileId(
  project: ProjectDetail,
  node: ProjectNode,
  profiles: PluginProfile[],
): string | null {
  if (node.pluginProfile) return node.pluginProfile

  const subProfile = resolveSubNodeProfile(project, node)
  if (subProfile === 'model') return 'llm-model'

  const slot = resolveConfigNodeSlot(project, node.id)
  if (slot === 1) return 'agent-memory'
  if (slot === 2) return 'agent-tool'

  if (node.kind === 'scrape') {
    const pluginId = String(node.options?.plugin_id ?? node.pluginId ?? '')
    if (pluginId) {
      const specific = profiles.find((p) => p.id === `scraper-${pluginId}`)
      if (specific) return specific.id
    }
    return 'scraper-source'
  }

  if (node.kind === 'agent' && slot === null) {
    return 'flow-agent'
  }

  const flowProfile = profiles.find(
    (profile) =>
      profile.slot_index == null &&
      profile.node_kinds.includes(node.kind) &&
      profile.id.startsWith('flow-'),
  )
  if (flowProfile) return flowProfile.id

  return null
}

export function resolveProfileForNode(
  project: ProjectDetail,
  node: ProjectNode,
  profiles: PluginProfile[],
): PluginProfile | null {
  const profileId = resolvePluginProfileId(project, node, profiles)
  if (!profileId) return null
  return profiles.find((p) => p.id === profileId) ?? null
}

export function applyPluginProfileDefaults(node: ProjectNode, profile: PluginProfile): ProjectNode {
  const nextOptions = { ...node.options }
  for (const section of profile.sections) {
    for (const field of section.fields) {
      if (field.default === undefined || field.default === null) continue
      if (nextOptions[field.key] !== undefined) continue
      nextOptions[field.key] = field.default as string | boolean | number
    }
  }
  return {
    ...node,
    pluginProfile: profile.id,
    pluginId: profile.plugin_id ?? node.pluginId ?? String(nextOptions.plugin_id ?? ''),
    options: nextOptions,
  }
}

export function pluginProfileLabels(profile: PluginProfile): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const section of profile.sections) {
    labels[`pluginProfile.section.${section.id}`] = section.label
    for (const field of section.fields) {
      labels[`pluginProfile.field.${field.key}`] = field.label
      if (field.placeholder) {
        labels[`pluginProfile.placeholder.${field.key}`] = field.placeholder
      }
      if (field.hint) {
        labels[`pluginProfile.hint.${field.key}`] = field.hint
      }
      for (const opt of field.options ?? []) {
        labels[`pluginProfile.option.${field.key}.${opt.value}`] = opt.label
      }
    }
  }
  return labels
}
