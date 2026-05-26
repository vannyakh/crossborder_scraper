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
      '/health': 'http://127.0.0.1:8000',
      '/config': 'http://127.0.0.1:8000',
      '/jobs': 'http://127.0.0.1:8000',
    },
  },
})
