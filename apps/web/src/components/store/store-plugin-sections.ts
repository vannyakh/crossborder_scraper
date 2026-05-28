export type StorePluginSectionId =
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
  { id: 'service', label: 'Service' },
  { id: 'port', label: 'Port' },
  { id: 'connection', label: 'Connection' },
  { id: 'storage', label: 'Storage location' },
  { id: 'logs', label: 'Logs' },
  { id: 'danger', label: 'Danger zone' },
]

export const STORE_DATABASE_SECTIONS: StorePluginSection[] = [
  { id: 'service', label: 'Service' },
  { id: 'port', label: 'Port' },
  { id: 'connection', label: 'Connection' },
  { id: 'storage', label: 'Storage location' },
  { id: 'logs', label: 'Logs' },
  { id: 'danger', label: 'Danger zone' },
]

export const STORE_SOURCE_SECTIONS: StorePluginSection[] = [
  { id: 'specification', label: 'E-commerce spec' },
  { id: 'domains', label: 'Domains' },
  { id: 'service', label: 'Status' },
]

export function sectionsForPlugin(
  kind?: string,
  options?: { isDatabase?: boolean },
): StorePluginSection[] {
  if (kind === 'source' || kind === 'site') {
    return STORE_SOURCE_SECTIONS
  }
  if (options?.isDatabase) {
    return STORE_DATABASE_SECTIONS
  }
  return STORE_SERVICE_SECTIONS
}
