/**
 * Database engine registry — single source for engine tabs, store plugin IDs, and panel routes.
 */
import {
  DATABASE_ENGINE_TABS,
  DEFAULT_DATABASE_ENGINE,
  databaseEnginePath,
  isDatabaseCatalogItem,
  isDatabaseEngineId,
  isDatabasePluginId,
  type DatabaseEngineId,
  type DatabaseEnginePluginId,
} from '../../config/databases'

export {
  DATABASE_ENGINE_TABS,
  DEFAULT_DATABASE_ENGINE,
  databaseEnginePath,
  isDatabaseCatalogItem,
  isDatabaseEngineId,
  isDatabasePluginId,
  type DatabaseEngineId,
  type DatabaseEnginePluginId,
}

export type DatabaseEngineRegistryEntry = {
  id: DatabaseEngineId
  labelKey: string
  pluginId: DatabaseEnginePluginId | null
}

export const DATABASE_ENGINE_REGISTRY: DatabaseEngineRegistryEntry[] = DATABASE_ENGINE_TABS.map(
  (tab) => ({
    id: tab.id,
    labelKey: tab.labelKey,
    pluginId: tab.pluginId,
  }),
)

export function getEngineRegistryEntry(
  engineId: DatabaseEngineId,
): DatabaseEngineRegistryEntry | undefined {
  return DATABASE_ENGINE_REGISTRY.find((entry) => entry.id === engineId)
}

export function enginePluginId(engineId: DatabaseEngineId): DatabaseEnginePluginId | null {
  return getEngineRegistryEntry(engineId)?.pluginId ?? null
}

export const managedDatabaseQueryKey = (pluginId: string) =>
  [...['store', 'plugin', pluginId], 'managed-database'] as const
