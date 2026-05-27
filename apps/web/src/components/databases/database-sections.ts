import {
  DEFAULT_DATABASE_ENGINE,
  DATABASE_ENGINE_TABS,
  databaseEnginePath,
  isDatabaseEngineId,
  type DatabaseEngineId,
} from '../../config/databases'

export {
  DATABASE_ENGINE_TABS,
  DEFAULT_DATABASE_ENGINE,
  databaseEnginePath,
  isDatabaseEngineId,
  type DatabaseEngineId,
}

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
