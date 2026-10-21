// The web component: src/element.ts with Vue and the stylesheet inside, as
// an ES module and as a classic script, into dist/element/. The builder
// serves and deploys that folder under element/, and the web-component
// export carries the module file.
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist/element',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/element.ts', import.meta.url)),
      name: 'FormsGenElement',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'es' ? 'formsgen-element.js' : 'formsgen-element.iife.js'),
    },
  },
})
