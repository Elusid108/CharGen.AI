import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isAllowedArtifactHost, isAllowedArtifactUrl } from '../../proxy/artifactAllowlist.js'

describe('artifact allow-list', () => {
  it('allows Tripo hosts and rejects look-alikes', () => {
    for (const h of ['tripo3d.ai', 'cdn.tripo3d.ai', 'tripo-data.cdn.tripo3d.ai', 'TRIPO3D.COM', 'x.tripo3d.com']) expect(isAllowedArtifactHost(h), h).toBe(true)
    for (const h of ['evil-tripo3d.ai', 'tripo3d.ai.evil.com', 'tripo3d.io', '', 'localhost']) expect(isAllowedArtifactHost(h), h).toBe(false)
    expect(isAllowedArtifactUrl('https://cdn.tripo3d.ai/a.glb')).toBe(true)
    expect(isAllowedArtifactUrl('ftp://cdn.tripo3d.ai/a.glb')).toBe(false)
    expect(isAllowedArtifactUrl('not a url')).toBe(false)
  })

  it('is the single source for both proxies', () => {
    const root = path.resolve(__dirname, '..', '..')
    expect(fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8')).toContain("from './proxy/artifactAllowlist.js'")
    expect(fs.readFileSync(path.join(root, 'proxy', 'tripo-worker.js'), 'utf8')).toContain("from './artifactAllowlist.js'")
    expect(fs.existsSync(path.join(root, 'proxy', 'wrangler.toml'))).toBe(true)
  })
})
