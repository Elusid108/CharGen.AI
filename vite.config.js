import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const tripoProxy = {
  '/tripo-api': {
    target: 'https://openapi.tripo3d.ai',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/tripo-api/, '/v3'),
  },
}

export default defineConfig({
  plugins: [react()],
  base: '/CharGen.AI/',
  server: { proxy: tripoProxy },
  preview: { proxy: tripoProxy },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        }
      }
    }
  }
})
