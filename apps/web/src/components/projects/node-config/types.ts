import type { ProjectNodeKind } from '../project-sample-data'

export type ProjectConfigTabId =
  | 'parameters'
  | 'source'
  | 'network'
  | 'variables'
  | 'settings'
  | 'export'
  | 'output'

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
  | 'prompt'
  | 'agent-settings'
  | 'keys'
  | 'fields'
  | 'proxy'

export type ProjectConfigFieldType =
  | 'text'
  | 'textarea'
  | 'mono'
  | 'url'
  | 'image'
  | 'hint'
  | 'select'
  | 'toggle'
  | 'llm_provider'
  | 'llm_model'
  | 'source_plugin'
  | 'variable_key'

export type ProjectConfigFieldResolve =
  | 'label'
  | 'subtitle'
  | 'host'
  | 'detail'
  | 'id'
  | 'kind'
  | 'role'
  | 'status'
  | 'image'

/** Writable node property keys (session preview). */
export type ProjectConfigFieldBind = 'label' | 'subtitle' | 'host' | 'detail' | 'agentPrompt'

export type ProjectConfigSelectOption = {
  value: string
  labelKey: string
  label?: string
}

export type ProjectConfigField = {
  id: string
  labelKey: string
  labelText?: string
  type: ProjectConfigFieldType
  /** Read-only display source on the node */
  resolve?: ProjectConfigFieldResolve
  /** Writable node property */
  bind?: ProjectConfigFieldBind
  /** Writable key under node.options */
  optionKey?: string
  editable?: boolean
  placeholderKey?: string
  placeholderText?: string
  hintKey?: string
  hintText?: string
  rows?: number
  options?: ProjectConfigSelectOption[]
}

export type ProjectConfigTab = {
  id: ProjectConfigTabId
  labelKey: string
}

export type ProjectConfigSection = {
  id: ProjectConfigSectionId
  labelKey: string
  labelText?: string
  tab: ProjectConfigTabId
  fields: ProjectConfigField[]
}

/** Loaded from JSON under node-config/schemas/ */
export type NodeConfigSchema = {
  kind?: ProjectNodeKind | 'default'
  defaultTab: ProjectConfigTabId
  /** Agent nodes: show slot chips + parameters form */
  parametersLayout?: 'default' | 'agent-slots'
  tabs: ProjectConfigTab[]
  sections: ProjectConfigSection[]
}
