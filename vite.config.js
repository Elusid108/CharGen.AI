import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const tripoProxy = {
  '/tripo-api': {
    target: 'https://openapi.tripo3d.ai',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/tripo-api/, '/v3'),
  },
}

function isAllowedArtifactHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  return (
    host === 'tripo3d.ai'
    || host === 'tripo3d.com'
    || host === 'cdn.tripo3d.ai'
    || host.endsWith('.tripo3d.ai')
    || host.endsWith('.tripo3d.com')
  )
}

function attachArtifactProxy(middlewares) {
  middlewares.use('/tripo-artifact', async (req, res) => {
    try {
      if (req.method && req.method !== 'GET') {
        res.statusCode = 405
        res.end('method not allowed')
        return
      }
      const incoming = new URL(req.originalUrl || req.url || '', 'http://localhost')
      const target = incoming.searchParams.get('url')
      if (!target) {
        res.statusCode = 400
        res.end('missing url')
        return
      }
      const parsed = new URL(target)
      if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || !isAllowedArtifactHost(parsed.hostname)) {
        res.statusCode = 403
        res.end('host not allowed')
        return
      }
      const upstream = await fetch(parsed.href, { redirect: 'follow' })
      res.statusCode = upstream.status
      const contentType = upstream.headers.get('content-type')
      if (contentType) res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      const buf = Buffer.from(await upstream.arrayBuffer())
      res.end(buf)
    } catch {
      res.statusCode = 502
      res.end('artifact fetch failed')
    }
  })
}

function tripoArtifactPlugin() {
  return {
    name: 'tripo-artifact-proxy',
    configureServer(server) {
      attachArtifactProxy(server.middlewares)
    },
    configurePreviewServer(server) {
      attachArtifactProxy(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [react(), tripoArtifactPlugin()],
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
        },
      },
    },
  },
})
