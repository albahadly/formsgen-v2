import { defineConfig, type Plugin } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ELEMENT_DIR = fileURLToPath(new URL('../../packages/renderer/dist/element', import.meta.url))

/**
 * The renderer's web-component bundle (packages/renderer/dist/element, built by
 * `pnpm --filter @albahadly/formsgen-renderer build:element`) served under element/ in
 * dev and copied into dist/element/ on build, so the deployed builder hosts it
 * and the web-component export can fetch its own copy.
 */
function elementBundle(): Plugin {
  return {
    name: 'formsgen-element-bundle',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = /^\/element\/([\w.-]+\.js)$/.exec((req.url ?? '').split('?')[0] ?? '')
        if (!match) return next()
        const file = join(ELEMENT_DIR, match[1] as string)
        if (!existsSync(file)) {
          res.statusCode = 404
          res.end('Build the web component first: pnpm --filter @albahadly/formsgen-renderer build:element')
          return
        }
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
        res.end(readFileSync(file))
      })
    },
    closeBundle() {
      if (!existsSync(ELEMENT_DIR)) return
      const out = fileURLToPath(new URL('./dist/element', import.meta.url))
      mkdirSync(out, { recursive: true })
      for (const name of readdirSync(ELEMENT_DIR)) copyFileSync(join(ELEMENT_DIR, name), join(out, name))
    },
  }
}

export default defineConfig({
  // builder.albahadly.com serves from the root; BASE_PATH stays available
  // for any host that serves the app under a subpath.
  base: process.env.BASE_PATH ?? '/',
  plugins: [vue(), tailwindcss(), elementBundle()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Workspace dev consumes the renderer by source; consumers of the
      // published package get dist via its package.json exports.
      '@albahadly/formsgen-renderer': fileURLToPath(
        new URL('../../packages/renderer/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries, the renderer and the builder ship as separate chunks (the
        // code view's highlighter and the ZIP writer only when first used).
        manualChunks: (id) => {
          if (id.includes('highlight.js')) return 'highlight'
          if (id.includes('jszip')) return 'zip'
          if (id.includes('/node_modules/')) return 'vendor'
          if (id.includes('/packages/renderer/')) return 'renderer'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
