import * as mongodb from './mongodb'
import * as mysql from './mysql'
import * as postgresql from './postgresql'
import * as redis from './redis'
import * as sqlite from './sqlite'
import type { DatabasePlatformModule, DbCharsetOption } from './types'

export type { DatabasePlatformModule, DbCharsetOption }

const MODULES: Record<string, DatabasePlatformModule> = {
  mysql,
  postgresql,
  mongodb,
  redis,
  sqlite,
}

export const DATABASE_PLATFORM_IDS = Object.keys(MODULES) as Array<keyof typeof MODULES>

export function getDatabasePlatform(pluginId: string): DatabasePlatformModule | undefined {
  return MODULES[pluginId]
}

export function charsetOptionsForEngine(pluginId: string): DbCharsetOption[] {
  const mod = MODULES[pluginId]
  return mod?.CHARSET_OPTIONS ?? [{ value: 'utf8mb4', label: 'utf8mb4' }]
}

export function defaultCharsetForEngine(pluginId: string): string {
  const mod = MODULES[pluginId]
  return mod?.DEFAULT_CHARSET ?? charsetOptionsForEngine(pluginId)[0]?.value ?? 'utf8mb4'
}

export function productLabelForEngine(pluginId: string): string {
  return MODULES[pluginId]?.PRODUCT_LABEL ?? pluginId
}
