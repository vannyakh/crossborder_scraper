import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/ui/',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/config': 'http://127.0.0.1:8000',
      '/stats': 'http://127.0.0.1:8000',
      '/gateway': 'http://127.0.0.1:8000',
      '/jobs': 'http://127.0.0.1:8000',
      '/batches': 'http://127.0.0.1:8000',
      '/products': 'http://127.0.0.1:8000',
      '/files': 'http://127.0.0.1:8000',
      '/ai': 'http://127.0.0.1:8000',
      '/runtime': 'http://127.0.0.1:8000',
      '/export': 'http://127.0.0.1:8000',
      '/monitor': 'http://127.0.0.1:8000',
      '/service': 'http://127.0.0.1:8000',
      '/store': 'http://127.0.0.1:8000',
      '/panel': 'http://127.0.0.1:8000',
      '/logs': 'http://127.0.0.1:8000',
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/config': 'http://127.0.0.1:8000',
      '/stats': 'http://127.0.0.1:8000',
      '/gateway': 'http://127.0.0.1:8000',
      '/jobs': 'http://127.0.0.1:8000',
      '/batches': 'http://127.0.0.1:8000',
      '/products': 'http://127.0.0.1:8000',
      '/files': 'http://127.0.0.1:8000',
      '/ai': 'http://127.0.0.1:8000',
      '/runtime': 'http://127.0.0.1:8000',
      '/export': 'http://127.0.0.1:8000',
      '/monitor': 'http://127.0.0.1:8000',
      '/service': 'http://127.0.0.1:8000',
      '/store': 'http://127.0.0.1:8000',
      '/panel': 'http://127.0.0.1:8000',
      '/logs': 'http://127.0.0.1:8000',
    },
  },
})
