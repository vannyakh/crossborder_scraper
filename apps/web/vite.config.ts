import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Read PANEL_PORT from repo root `.env` when Vite is started without env exports. */
function panelPortFromRootEnv(): number | undefined {
  const envPath = resolve(repoRoot, '.env')
  if (!existsSync(envPath)) return undefined
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^PANEL_PORT\s*=\s*(.+)$/)
    if (!match) continue
    const value = Number(match[1].trim().replace(/^["']|["']$/g, ''))
    if (Number.isFinite(value) && value > 0) return value
  }
  return undefined
}

const panelPort =
  Number(process.env.PANEL_PORT || process.env.VITE_API_PORT) ||
  panelPortFromRootEnv() ||
  8787
const apiTarget = `http://127.0.0.1:${panelPort}`

// eslint-disable-next-line no-console
console.log(`[vite] API proxy → ${apiTarget}`)

const apiProxy = {
  '/auth': apiTarget,
  '/health': apiTarget,
  '/config': apiTarget,
  '/stats': apiTarget,
  '/gateway': apiTarget,
  '/jobs': { target: apiTarget, ws: true },
  '/batches': apiTarget,
  '/products': apiTarget,
  '/files': apiTarget,
  '/ai': apiTarget,
  '/runtime': apiTarget,
  '/export': apiTarget,
  '/monitor': apiTarget,
  '/service': apiTarget,
  '/store': apiTarget,
  '/plugins': apiTarget,
  '/panel': apiTarget,
  '/deploy': apiTarget,
  '/logs': apiTarget,
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/ui/',
  server: {
    port: 5173,
    strictPort: true,
    proxy: apiProxy,
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: apiProxy,
  },
})
