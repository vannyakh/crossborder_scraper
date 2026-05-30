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

export type ProjectConfigFieldType =
  | 'text'
  | 'textarea'
  | 'mono'
  | 'url'
  | 'image'
  | 'hint'
  | 'select'
  | 'toggle'

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
}

export type ProjectConfigField = {
  id: string
  labelKey: string
  type: ProjectConfigFieldType
  /** Read-only display source on the node */
  resolve?: ProjectConfigFieldResolve
  /** Writable node property */
  bind?: ProjectConfigFieldBind
  /** Writable key under node.options */
  optionKey?: string
  editable?: boolean
  placeholderKey?: string
  hintKey?: string
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
