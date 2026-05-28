import type { DatabaseProviderInfo } from '../api/types'

export type { DatabaseProviderInfo }

/** Fetch provider catalog from gateway (panel-managed engines). */
export async function fetchDatabaseProviders(
  api: <T>(path: string, init?: RequestInit) => Promise<T>,
): Promise<DatabaseProviderInfo[]> {
  const res = await api<{ items: DatabaseProviderInfo[]; total: number }>(
    '/store/database-providers',
  )
  return res.items
}

export function providerById(
  items: DatabaseProviderInfo[],
  id: string,
): DatabaseProviderInfo | undefined {
  return items.find((row) => row.id === id)
}
