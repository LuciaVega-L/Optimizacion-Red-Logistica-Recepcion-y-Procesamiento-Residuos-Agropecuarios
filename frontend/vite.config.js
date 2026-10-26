import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Redirige /api al backend para evitar problemas de CORS en desarrollo
    proxy: { '/api': 'http://localhost:8000' },
  },
})
