import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)))
const pdfjsVersion = JSON.parse(
  readFileSync(path.join(root, 'node_modules/pdfjs-dist/package.json'), 'utf8'),
).version as string

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __PDFJS_VERSION__: JSON.stringify(pdfjsVersion),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
