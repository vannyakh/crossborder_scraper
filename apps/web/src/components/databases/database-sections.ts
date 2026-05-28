export {
  DATABASE_ENGINE_REGISTRY,
  DATABASE_ENGINE_TABS,
  DEFAULT_DATABASE_ENGINE,
  databaseEnginePath,
  enginePluginId,
  getEngineRegistryEntry,
  isDatabaseCatalogItem,
  isDatabaseEngineId,
  isDatabasePluginId,
  type DatabaseEngineId,
  type DatabaseEnginePluginId,
  type DatabaseEngineRegistryEntry,
} from '../../lib/databases/registry'

import { isDatabaseEngineId, type DatabaseEngineId } from '../../lib/databases/registry'

/** Legacy section routes → engine tabs */
const LEGACY_SECTION_MAP: Record<string, DatabaseEngineId> = {
  installed: 'mysql',
  install: 'mysql',
  sqlite: 'sqlite',
}

export function resolveDatabaseEngine(section: string | undefined): DatabaseEngineId | null {
  if (!section) return null
  if (isDatabaseEngineId(section)) return section
  return LEGACY_SECTION_MAP[section] ?? null
}
