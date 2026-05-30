import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { panelUiBaseRedirectPlugin } from './vite-plugin-panel-base'

const webRoot = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(webRoot, '../..')

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

function devPanelPortFromRootEnv(): number | undefined {
  const raw = envStringFromRoot('DEV_PANEL_PORT')
  if (raw) {
    const value = Number(raw)
    if (Number.isFinite(value) && value > 0) return value
  }
  const panel = panelPortFromRootEnv()
  return panel ? panel + 1 : undefined
}

/** 8-char hex entrance prefix for dev proxy (matches panel URL /a1b2c3d4/ui/...). */
function panelEntryFromRootEnv(): string | undefined {
  const raw = (envStringFromRoot('PANEL_ENTRY_PATH') || '').trim().toLowerCase()
  if (!raw || raw === 'off' || raw === 'false' || raw === 'disabled') return undefined
  const hex = raw.replace(/^\//, '')
  return /^[a-f0-9]{8}$/.test(hex) ? hex : undefined
}

/** Security entrance is production-only — Vite dev uses bare /ui/ and unprefixed API paths. */
const DEV_PANEL_ENTRY: string | undefined = undefined

const API_PROXY_PATHS = [
  '/auth',
  '/health',
  '/config',
  '/stats',
  '/gateway',
  '/guides',
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
  '/vhost',
  '/logs',
  '/projects',
] as const

async function probeDevApiPort(port: number): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 600)
    const res = await fetch(`http://127.0.0.1:${port}/panel/access`, {
      signal: controller.signal,
    })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

async function probeApiPort(port: number, entryPath?: string): Promise<boolean> {
  const paths = entryPath ? [`/${entryPath}/health`, '/health'] : ['/health']
  for (const healthPath of paths) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 600)
      const res = await fetch(`http://127.0.0.1:${port}${healthPath}`, {
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!res.ok) continue
      const body = (await res.json()) as { status?: string }
      if (body.status === 'ok') return true
    } catch {
      /* try next path */
    }
  }
  return false
}

/** Pick API port: explicit VITE_API_PORT, else first live /health among common dev ports. */
async function resolveApiPort(): Promise<{ port: number; live: boolean }> {
  const explicit = Number(process.env.VITE_API_PORT)
  if (Number.isFinite(explicit) && explicit > 0) {
    const live =
      (await probeDevApiPort(explicit)) || (await probeApiPort(explicit, panelEntryFromRootEnv()))
    return { port: explicit, live }
  }

  const fromEnv = panelPortFromRootEnv()
  const devPort = devPanelPortFromRootEnv()
  const panelEntry = panelEntryFromRootEnv()
  const candidates = [
    ...new Set([devPort, fromEnv, 8787, 8788, 8000].filter((p): p is number => !!p && p > 0)),
  ]

  for (const port of candidates) {
    if (await probeDevApiPort(port)) return { port, live: true }
  }

  for (const port of candidates) {
    if (await probeApiPort(port, panelEntry)) return { port, live: true }
  }

  return { port: fromEnv ?? 8000, live: false }
}

function buildApiProxy(target: string, entryPath?: string) {
  const proxy: Record<string, string | { target: string; ws?: boolean }> = {}
  for (const path of API_PROXY_PATHS) {
    const config = path === '/jobs' || path === '/projects' ? { target, ws: true } : target
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
  const apiProxy = buildApiProxy(apiTarget, DEV_PANEL_ENTRY)

  const explicit = process.env.VITE_API_PORT

  console.log(
    `[vite] API proxy → ${apiTarget} (dev — security entrance off)${
      explicit ? ' (VITE_API_PORT)' : ' (auto-detected)'
    }`,
  )
  if (!apiLive) {
    console.warn(
      `[vite] WARNING: no live API at ${apiTarget}/health — /health and other API calls will 502 until you start the backend:\n` +
        `       bash scripts/serve-api.sh   (or: make dev-api)`,
    )
  }

  return {
    plugins: [react(), tailwindcss(), panelUiBaseRedirectPlugin(API_PROXY_PATHS, DEV_PANEL_ENTRY)],
    base: '/ui/',
    define: {
      'import.meta.env.VITE_PANEL_ENTRY_PATH': JSON.stringify(''),
    },
    resolve: {
      alias: {
        '@': resolve(webRoot, 'src'),
      },
    },
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
