import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // GitHub Pages serves the app from /formsgen-v2/; local dev and other
  // hosts use the root path. The deploy workflow sets BASE_PATH.
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
