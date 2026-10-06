// Vite config for bundling one exported standalone Vue component.
// The plugin and Vue itself come from the builder's node_modules (the toolkit
// has no Vue dependency of its own), located relative to this file so the
// repository can live anywhere. The project root is the per-run work directory
// (FG_VUE_ROOT) where run-matrix.sh places Form.vue, main.ts and index.html.
// The plugin is loaded with a dynamic import so Vite does not inline it into
// the bundled config; it then resolves its own dependencies from its own place.
import { fileURLToPath, pathToFileURL } from 'node:url'

const builderModule = (p) => fileURLToPath(new URL('../../../apps/builder/node_modules/' + p, import.meta.url))
const { default: vue } = await import(pathToFileURL(builderModule('@vitejs/plugin-vue/dist/index.mjs')).href)

export default {
  root: process.env.FG_VUE_ROOT,
  plugins: [vue()],
  resolve: { alias: { vue: builderModule('vue/dist/vue.runtime.esm-bundler.js') } },
  define: { __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false' },
  logLevel: 'error',
}
