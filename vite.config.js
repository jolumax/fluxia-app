import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill global for libraries that depend on it (like jspdf/xlsx)
    global: 'window',
  },
  resolve: {
    alias: {
      xlsx: resolve(__dirname, './node_modules/xlsx/xlsx.mjs'),
      // Add stream alias to a dummy or browser-native module if needed,
      // but 'define' usually handles the most common crash cases.
    },
  },
  optimizeDeps: {
    include: ['xlsx', 'jspdf'],
  }
})
