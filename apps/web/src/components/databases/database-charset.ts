import type { DatabaseEnginePluginId } from '../../config/databases'

export type DbCharsetOption = {
  value: string
  label: string
}

/** Charset / encoding options shown in the create-database dialog. */
export function charsetOptionsForEngine(
  pluginId: DatabaseEnginePluginId | string,
): DbCharsetOption[] {
  switch (pluginId) {
    case 'mysql':
      return [
        { value: 'utf8mb4', label: 'utf8mb4' },
        { value: 'utf-8', label: 'utf-8' },
        { value: 'gbk', label: 'gbk' },
        { value: 'big5', label: 'big5' },
        { value: 'latin1', label: 'latin1' },
      ]
    case 'postgresql':
      return [
        { value: 'UTF8', label: 'UTF8' },
        { value: 'LATIN1', label: 'LATIN1' },
        { value: 'SQL_ASCII', label: 'SQL_ASCII' },
      ]
    case 'mongodb':
      return [{ value: 'utf8mb4', label: 'utf8mb4 (default)' }]
    default:
      return [{ value: 'utf8mb4', label: 'utf8mb4' }]
  }
}

export function defaultCharsetForEngine(pluginId: DatabaseEnginePluginId | string): string {
  return charsetOptionsForEngine(pluginId)[0]?.value ?? 'utf8mb4'
}
