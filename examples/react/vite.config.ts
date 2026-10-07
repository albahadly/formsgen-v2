import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tailwind is only needed for the Tailwind variant (src/tailwind.css); the
// plugin is harmless for the other two.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
