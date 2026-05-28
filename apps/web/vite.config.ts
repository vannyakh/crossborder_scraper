import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { panelUiBaseRedirectPlugin } from './vite-plugin-panel-base'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Read a string value from repo root `.env`. */
function envStringFromRoot(key: string): string | undefined {
  const envPath = resolve(repoRoot, '.env')
  if (!existsSync(envPath)) return undefined
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(new RegExp(`^${key}\\s*=\\s*(.+)$`))
    if (!match) continue
    const raw = match[1].trim().replace(/^["']|["']$/g, '')
    if (raw) return raw
  }
  return undefined
}

function panelPortFromRootEnv(): number | undefined {
  const raw = envStringFromRoot('PANEL_PORT')
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

/** 8-char hex entrance prefix for dev proxy (matches panel URL /a1b2c3d4/ui/...). */
function panelEntryFromRootEnv(): string | undefined {
  const raw = (envStringFromRoot('PANEL_ENTRY_PATH') || '').trim().toLowerCase()
  if (!raw || raw === 'off' || raw === 'false' || raw === 'disabled') return undefined
  const hex = raw.replace(/^\//, '')
  return /^[a-f0-9]{8}$/.test(hex) ? hex : undefined
}

const API_PROXY_PATHS = [
  '/auth',
  '/health',
  '/config',
  '/stats',
  '/gateway',
  '/jobs',
  '/batches',
  '/products',
  '/files',
  '/ai',
  '/runtime',
  '/export',
  '/monitor',
  '/service',
  '/store',
  '/plugins',
  '/panel',
  '/deploy',
  '/docker',
  '/firewall',
  '/logs',
] as const

async function probeApiPort(port: number): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 600)
    const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return false
    const body = (await res.json()) as { status?: string }
    return body.status === 'ok'
  } catch {
    return false
  }
}

/** Pick API port: explicit VITE_API_PORT, else first live /health among common dev ports. */
async function resolveApiPort(): Promise<{ port: number; live: boolean }> {
  const explicit = Number(process.env.VITE_API_PORT)
  if (Number.isFinite(explicit) && explicit > 0) {
    const live = await probeApiPort(explicit)
    return { port: explicit, live }
  }

  const fromEnv = panelPortFromRootEnv()
  const candidates = [...new Set([8000, fromEnv, 8787].filter((p): p is number => !!p && p > 0))]

  for (const port of candidates) {
    if (await probeApiPort(port)) return { port, live: true }
  }

  return { port: fromEnv ?? 8000, live: false }
}

function buildApiProxy(target: string, entryPath?: string) {
  const proxy: Record<string, string | { target: string; ws?: boolean }> = {}
  for (const path of API_PROXY_PATHS) {
    const config = path === '/jobs' ? { target, ws: true } : target
    proxy[path] = config
    if (entryPath) {
      proxy[`/${entryPath}${path}`] = config
    }
  }
  return proxy
}

export default defineConfig(async () => {
  const { port: panelPort, live: apiLive } = await resolveApiPort()
  const apiTarget = `http://127.0.0.1:${panelPort}`
  const panelEntry = panelEntryFromRootEnv()
  const apiProxy = buildApiProxy(apiTarget, panelEntry)

  const explicit = process.env.VITE_API_PORT
  // eslint-disable-next-line no-console
  console.log(
    `[vite] API proxy → ${apiTarget}${panelEntry ? ` (entrance /${panelEntry})` : ''}${
      explicit ? ' (VITE_API_PORT)' : ' (auto-detected)'
    }`,
  )
  if (!apiLive) {
    // eslint-disable-next-line no-console
    console.warn(
      `[vite] WARNING: no live API at ${apiTarget}/health — /health and other API calls will 502 until you start the backend:\n` +
        `       bash scripts/serve-api.sh   (or: make dev-api)`,
    )
  }

  return {
    plugins: [react(), tailwindcss(), panelUiBaseRedirectPlugin(API_PROXY_PATHS)],
    base: '/ui/',
    server: {
      port: 5173,
      strictPort: true,
      open: '/ui/',
      proxy: apiProxy,
    },
    preview: {
      port: 4173,
      strictPort: true,
      proxy: apiProxy,
    },
  }
})
