import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/ - Deployment config verified
export default defineConfig({
    plugins: [react()],
    base: '/monopoly-medellin/',
})
