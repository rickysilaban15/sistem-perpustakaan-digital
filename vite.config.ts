// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Pisahkan vendor libraries
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts', 'chart.js'],
          'pdf': ['jspdf', 'jspdf-autotable'],
          'ui': ['lucide-react', 'react-hot-toast'],
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Naikkan limit warning
  }
})