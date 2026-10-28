import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Port Frontend (Vite)
    allowedHosts: [
      'iguana-showcase-doorpost.ngrok-free.dev', // Domain Ngrok Anda
      '.ngrok-free.app',                         // Wildcard domain Ngrok lainnya
      '.ngrok-free.dev',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5003', // Mengarahkan request /api ke Backend port 5003
        changeOrigin: true,
      },
    },
  },
})