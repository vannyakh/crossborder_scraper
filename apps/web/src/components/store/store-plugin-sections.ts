export type StorePluginSectionId =
  | 'guide'
  | 'service'
  | 'specification'
  | 'domains'
  | 'port'
  | 'connection'
  | 'storage'
  | 'logs'
  | 'danger'

export type StorePluginSection = {
  id: StorePluginSectionId
  label: string
}

export const STORE_SERVICE_SECTIONS: StorePluginSection[] = [
  { id: 'guide', label: 'Guide' },
  { id: 'service', label: 'Service' },
  { id: 'port', label: 'Port' },
  { id: 'connection', label: 'Connection' },
  { id: 'storage', label: 'Storage location' },
  { id: 'logs', label: 'Logs' },
  { id: 'danger', label: 'Danger zone' },
]

export const STORE_DATABASE_SECTIONS: StorePluginSection[] = [
  { id: 'guide', label: 'Guide' },
  { id: 'service', label: 'Service' },
  { id: 'port', label: 'Port' },
  { id: 'connection', label: 'Connection' },
  { id: 'storage', label: 'Storage location' },
  { id: 'logs', label: 'Logs' },
  { id: 'danger', label: 'Danger zone' },
]

export const STORE_SOURCE_SECTIONS: StorePluginSection[] = [
  { id: 'guide', label: 'Guide' },
  { id: 'specification', label: 'E-commerce spec' },
  { id: 'domains', label: 'Domains' },
  { id: 'service', label: 'Status' },
]

export function sectionsForPlugin(
  kind?: string,
  options?: { isDatabase?: boolean; hasGuide?: boolean },
): StorePluginSection[] {
  let sections: StorePluginSection[]
  if (kind === 'source' || kind === 'site') {
    sections = STORE_SOURCE_SECTIONS
  } else if (options?.isDatabase) {
    sections = STORE_DATABASE_SECTIONS
  } else {
    sections = STORE_SERVICE_SECTIONS
  }
  if (!options?.hasGuide) {
    sections = sections.filter((section) => section.id !== 'guide')
  }
  return sections
}
