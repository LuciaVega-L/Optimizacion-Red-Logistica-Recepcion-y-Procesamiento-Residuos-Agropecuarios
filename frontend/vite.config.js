import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // El backend expone las rutas sin prefijo /api y permite CORS desde este puerto
    // (ver backend/main.py), así que el cliente llama directamente a VITE_API_URL.
    port: 5173,
  },
})
