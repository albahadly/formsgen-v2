import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // builder.albahadly.com serves from the root; BASE_PATH stays available
  // for any host that serves the app under a subpath.
  base: process.env.BASE_PATH ?? '/',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Workspace dev consumes the renderer by source; consumers of the
      // published package get dist via its package.json exports.
      '@formsgen/renderer': fileURLToPath(
        new URL('../../packages/renderer/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
  },
})
