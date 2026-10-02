import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const SCAN = ['src', 'proxy', 'scripts', 'references', 'README.md', 'CLAUDE.md', 'index.html', 'vite.config.js']
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.glb', '.gltf', '.bin', '.ico', '.svg'])
const PATTERNS = [
  { name: 'Tripo key', re: /\btsk_[A-Za-z0-9]{8,}/ },
  { name: 'Google key', re: /\bAIza[0-9A-Za-z_-]{20,}/ },
  { name: 'OpenAI-style key', re: /\bsk-[A-Za-z0-9]{16,}/ },
]

function walk(p, out) {
  if (!fs.existsSync(p)) return out
  const stat = fs.statSync(p)
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(p)) walk(path.join(p, name), out)
  } else if (!SKIP_EXT.has(path.extname(p)) && !p.endsWith('secretScan.test.js')) {
    out.push(p)
  }
  return out
}

describe('secret scan', () => {
  it('finds no key-shaped strings in the tracked tree', () => {
    const files = SCAN.flatMap((rel) => walk(path.join(ROOT, rel), []))
    expect(files.length).toBeGreaterThan(10)
    const hits = []
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8')
      for (const { name, re } of PATTERNS) {
        if (re.test(text)) hits.push(`${name}: ${path.relative(ROOT, file)}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('.gitignore blocks env files and worker scratch', () => {
    const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')
    expect(ignore).toMatch(/^\.env\.\*$/m)
    expect(ignore).toMatch(/^\.wrangler\/$/m)
    expect(fs.existsSync(path.join(ROOT, '.cursor', 'rules', 'version-and-readme.mdc'))).toBe(false)
    expect(fs.existsSync(path.join(ROOT, 'CLAUDE.md'))).toBe(true)
  })
})
