import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Pruebas de vistas contra el backend real (ver src/__tests__/vistas.spec.ts). jsdom no define fetch: se usa el de Node.
    environment: 'jsdom',
    testTimeout: 30000,
  },
  server: {
    // En desarrollo el frontend llama a /api y Vite lo reenvía al backend de NestJS.
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
