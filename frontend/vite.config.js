import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Mirrors nginx in production, so links in emails (APP_URL/api/...) work
  // against the dev server when APP_URL=http://localhost:5173.
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
})
