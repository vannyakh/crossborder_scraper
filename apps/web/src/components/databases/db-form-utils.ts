import type { DbAccessMode } from './database-access'
import { defaultCharsetForEngine } from './database-charset'

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
