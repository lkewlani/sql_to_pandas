import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Target modern browsers — ensures the static build is lean
    target: 'es2020',
    outDir: 'dist',
  },
  resolve: {
    alias: {
      // Allows imports like "@/core/types" → "src/core/types"
      '@': '/src',
    },
  },
})
