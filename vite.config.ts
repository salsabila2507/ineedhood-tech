import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: true, port: 8080 },
  preview: { host: true, port: 8080, strictPort: true },
})
