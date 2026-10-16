import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the project from /<repository>/, local dev from /
  base: process.env.GITHUB_ACTIONS ? '/green-api-test/' : '/',
})
