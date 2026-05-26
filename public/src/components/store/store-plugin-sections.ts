export type StorePluginSectionId = 'service' | 'port' | 'connection' | 'storage' | 'logs'

export type StorePluginSection = {
  id: StorePluginSectionId
  label: string
}

export const STORE_PLUGIN_SECTIONS: StorePluginSection[] = [
  { id: 'service', label: 'Service' },
  { id: 'port', label: 'Port' },
  { id: 'connection', label: 'Connection' },
  { id: 'storage', label: 'Storage location' },
  { id: 'logs', label: 'Logs' },
]
