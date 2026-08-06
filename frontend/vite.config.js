import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../',      // build output goes to project root
    emptyOutDir: false  // don't wipe the root folder (keeps api/, etc.)
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost/EPLDLS',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
