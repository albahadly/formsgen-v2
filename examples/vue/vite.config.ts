import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Tailwind is only needed for the Tailwind variant (src/tailwind.css); the
// plugin is harmless for the other variants.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
