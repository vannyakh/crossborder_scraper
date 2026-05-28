import type { StoreCatalogItem, StoreConnectRequest } from '../../lib/api'
import type { DbAccessMode } from './database-access'
import { defaultCharsetForEngine } from './database-charset'

export function defaultConnectForm(item: StoreCatalogItem): StoreConnectRequest {
  const form: StoreConnectRequest = {
    host: '127.0.0.1',
    port: item.default_port,
  }
  for (const field of item.connection_fields) {
    if (field.key === 'host' && field.default != null) form.host = String(field.default)
    if (field.key === 'port' && field.default != null) form.port = Number(field.default)
    if (field.key === 'username' && field.default != null) form.username = String(field.default)
    if (field.key === 'database' && field.default != null) form.database = String(field.default)
  }
  return form
}

export function randomDbUsername(): string {
  const hex = crypto.getRandomValues(new Uint8Array(4))
  return `u${Array.from(hex, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

export function randomDbPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const raw = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, 'A')
    .replace(/\//g, 'B')
    .replace(/=+$/, '')
  return raw.slice(0, 16)
}

export type DatabaseCreateDraft = {
  name: string
  username: string
  password: string
  charset: string
  access: DbAccessMode
}

export function newDatabaseCreateDraft(pluginId: string): DatabaseCreateDraft {
  return {
    name: '',
    username: randomDbUsername(),
    password: randomDbPassword(),
    charset: defaultCharsetForEngine(pluginId),
    access: 'local',
  }
}
