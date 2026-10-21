// The CLI is one bundled Node script: the builder's export code (TypeScript,
// `@` alias) and the renderer (whose entry imports Vue components, hence the
// Vue plugin) go in, Node's built-ins stay out. Vue is bundled too, so the
// published package has no runtime dependencies.
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../../apps/builder/src', import.meta.url)),
      '@albahadly/formsgen-renderer': fileURLToPath(new URL('../../packages/renderer/src/index.ts', import.meta.url)),
    },
  },
  build: {
    ssr: 'src/cli.ts',
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: { entryFileNames: 'formsgen.mjs', banner: '#!/usr/bin/env node' },
    },
  },
  ssr: { noExternal: true, target: 'node' },
  test: { environment: 'node' },
})
