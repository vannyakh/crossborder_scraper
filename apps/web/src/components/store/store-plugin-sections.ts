export type StorePluginSectionId =
  | 'service'
  | 'specification'
  | 'domains'
  | 'port'
  | 'connection'
  | 'storage'
  | 'logs'

export type StorePluginSection = {
  id: StorePluginSectionId
  label: string
}

export const STORE_SERVICE_SECTIONS: StorePluginSection[] = [
  { id: 'service', label: 'Service' },
  { id: 'port', label: 'Port' },
  { id: 'connection', label: 'Manage' },
  { id: 'storage', label: 'Storage location' },
  { id: 'logs', label: 'Logs' },
]

export const STORE_SOURCE_SECTIONS: StorePluginSection[] = [
  { id: 'specification', label: 'E-commerce spec' },
  { id: 'domains', label: 'Domains' },
  { id: 'service', label: 'Status' },
]

export function sectionsForPlugin(kind?: string): StorePluginSection[] {
  if (kind === 'source' || kind === 'site') {
    return STORE_SOURCE_SECTIONS
  }
  return STORE_SERVICE_SECTIONS
}
