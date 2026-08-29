import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Default (bare "localhost") only bound the IPv6 loopback (::1) on this
  // machine — 127.0.0.1 (IPv4), the address PAYMENT_CALLBACK_BASE_URL and
  // every other local .env value use, got ERR_CONNECTION_REFUSED. Listening
  // on all interfaces makes both resolve to this same dev server.
  server: {
    host: true,
  },
})
