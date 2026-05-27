import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const panelPort = Number(process.env.PANEL_PORT || process.env.VITE_API_PORT || 8787)
const apiTarget = `http://127.0.0.1:${panelPort}`

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
