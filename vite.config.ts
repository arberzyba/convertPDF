import { cpSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// pdf.js fetches its image decoders and character maps at runtime, so they are served as static files.
for (const dir of ['wasm', 'cmaps']) {
  cpSync(`node_modules/pdfjs-dist/${dir}`, `public/pdfjs/${dir}`, { recursive: true })
}

export default defineConfig({
  base: './',
  plugins: [react()],
})
