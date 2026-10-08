import { cpSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// pdf.js fetches its image decoders and character maps at runtime, so they are served as static files.
for (const dir of ['wasm', 'cmaps']) {
  cpSync(`node_modules/pdfjs-dist/${dir}`, `public/pdfjs/${dir}`, { recursive: true })
}

// jsDelivr is allowed because the OCR engine and its language data are downloaded from there on first use.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "connect-src 'self' data: blob: https://cdn.jsdelivr.net",
  "img-src 'self' data: blob:",
  "font-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      // Set in the page itself so it applies on any static host. Build only: the dev server needs inline scripts.
      name: 'content-security-policy',
      apply: 'build',
      transformIndexHtml: () => [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
      ],
    },
  ],
})
