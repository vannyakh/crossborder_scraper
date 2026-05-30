/** @deprecated Import from `./node-config/registry` — schemas live in JSON files. */
export {
  configSectionsForTab,
  countSchemaFields,
  defaultImageForKind,
  getNodeConfigSchema,
  isFieldEditable,
  publicUrlForNode,
  resolveFieldValue,
  type NodeConfigSchema,
  type ProjectConfigField,
  type ProjectConfigTabId,
} from './node-config/registry'

export type {
  ProjectConfigSection,
  ProjectConfigSectionId,
  ProjectConfigFieldType,
} from './node-config/types'
