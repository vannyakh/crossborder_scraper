/** Store service plugin IDs for engine tabs (excludes built-in SQLite) */
export const DATABASE_ENGINE_PLUGIN_IDS = ['mysql', 'postgresql', 'mongodb', 'redis'] as const

export type DatabaseEnginePluginId = (typeof DATABASE_ENGINE_PLUGIN_IDS)[number]

export type DatabaseEngineId = DatabaseEnginePluginId | 'sqlite'

export const DATABASE_ENGINE_TABS: {
  id: DatabaseEngineId
  labelKey: string
  pluginId: DatabaseEnginePluginId | null
}[] = [
  { id: 'mysql', labelKey: 'db.engine.mysql', pluginId: 'mysql' },
  { id: 'postgresql', labelKey: 'db.engine.postgresql', pluginId: 'postgresql' },
  { id: 'mongodb', labelKey: 'db.engine.mongodb', pluginId: 'mongodb' },
  { id: 'redis', labelKey: 'db.engine.redis', pluginId: 'redis' },
  { id: 'sqlite', labelKey: 'db.engine.sqlite', pluginId: null },
]

export const DEFAULT_DATABASE_ENGINE: DatabaseEngineId = 'mysql'

export function isDatabaseEngineId(value: string | undefined): value is DatabaseEngineId {
  return DATABASE_ENGINE_TABS.some((tab) => tab.id === value)
}

export function databaseEnginePath(engine: DatabaseEngineId): string {
  return `/databases/${engine}`
}

export function isDatabasePluginId(value: string): value is DatabaseEnginePluginId {
  return (DATABASE_ENGINE_PLUGIN_IDS as readonly string[]).includes(value)
}

export function isDatabaseCatalogItem(item: { id?: string; plugin_id?: string; category: string }) {
  const id = item.id ?? item.plugin_id ?? ''
  return item.category === 'database' || item.category === 'cache' || isDatabasePluginId(id)
}

/** @deprecated use isDatabaseEngineId */
export const DATABASE_PLUGIN_IDS = DATABASE_ENGINE_PLUGIN_IDS
