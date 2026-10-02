#!/usr/bin/env node
/**
 * 3D Studio smoke test against `vite preview` with every Tripo call mocked.
 * Needs a global `playwright` + Chromium (not a project dependency):
 *   npm run build && node tests/e2e/studio.smoke.mjs
 * Nothing here talks to Tripo or Google.
 */
import { spawn } from 'node:child_process'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import JSZip from 'jszip'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  try {
    ;({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright'))
  } catch {
    console.error('playwright is not installed (npm i -g playwright); skipping smoke test')
    process.exit(0)
  }
}

const PORT = 4173
const BASE = `http://localhost:${PORT}/CharGen.AI/`
const FIXTURE = readFileSync(resolve('tests/fixtures/cube-anim.glb'))
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==', 'base64')
const OUT = resolve('tests/e2e/.out')
mkdirSync(OUT, { recursive: true })

const log = (...a) => console.log('[smoke]', ...a)
const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERT: ${msg}`)
}

function startPreview() {
  const vite = resolve('node_modules/vite/bin/vite.js')
  const child = spawn(process.execPath, [vite, 'preview', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] })
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('preview did not start')), 30000)
    child.stdout.on('data', (d) => {
      if (String(d).includes(String(PORT))) {
        clearTimeout(t)
        res(child)
      }
    })
    child.stderr.on('data', (d) => process.stderr.write(d))
    child.on('exit', (code) => rej(new Error(`preview exited ${code}`)))
  })
}

// --- Tripo mock -------------------------------------------------------------------------------
const tasks = new Map()
let polls = 0
function makeTask(id, output, { ticks = 1 } = {}) {
  tasks.set(id, { task_id: id, status: 'queued', progress: 0, output: null, final: output, ticks, credits_consumed: 20 })
}
function pollTask(id) {
  const t = tasks.get(id)
  if (!t) return { code: 2001, message: 'no such task' }
  polls += 1
  if (t.ticks > 0) {
    t.ticks -= 1
    t.status = 'running'
    t.progress = 50
  } else {
    t.status = 'success'
    t.progress = 100
    t.output = t.final
  }
  return { code: 0, data: { task_id: id, status: t.status, progress: t.progress, output: t.output, credits_consumed: t.credits_consumed } }
}
const CDN = 'https://tripo-data.rg1.data.tripo3d.com/mock'
// Mock keys (not key-shaped, so the secret scan stays quiet). GOOD_KEY is International-only;
// CN_KEY only works on the China host, which the Settings region detection must find.
const GOOD_KEY = 'tripo-test-key'
const CN_KEY = 'tripo-cn-key'
let cnBalanceCalls = 0
async function tripoCnRoute(route) {
  const req = route.request()
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  if (req.headers().authorization !== `Bearer ${CN_KEY}`) return json({ code: 1002, message: 'Authentication failed' }, 401)
  cnBalanceCalls += 1
  return json({ code: 0, data: { balance: 77, frozen: 0 } })
}
let created = 0
async function tripoRoute(route) {
  const req = route.request()
  const url = new URL(req.url())
  const path = url.pathname.replace(/^.*\/tripo-api/, '')
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  if (req.headers().authorization !== `Bearer ${GOOD_KEY}`) return json({ code: 1002, message: 'Authentication failed' }, 401)
  if (path === '/account/balance') return json({ code: 0, data: { balance: 500, frozen: 0 } })
  if (path === '/files' || path === '/upload/sts') return json({ code: 0, data: { file_token: 'tok_' + (++created) } })
  if (path === '/tasks/list') {
    const ids = JSON.parse(req.postData() || '{}').task_ids || []
    return json({ code: 0, data: { tasks: ids.map((id) => pollTask(id).data).filter(Boolean) } })
  }
  const m = /^\/tasks\/([^/]+)$/.exec(path)
  if (m && req.method() === 'GET') return json(pollTask(m[1]))
  if (req.method() === 'POST') {
    const body = JSON.parse(req.postData() || '{}')
    const id = `task_${++created}`
    if (path === '/generation/text-to-model') {
      assert(body.prompt, 'text-to-model sends prompt')
      assert(body.model, 'text-to-model sends model')
      makeTask(id, { pbr_model: `${CDN}/${id}/model.glb`, rendered_image: `${CDN}/${id}/preview.jpg` })
    } else if (path === '/animations/rig-check') {
      makeTask(id, { riggable: true, rig_type: 'biped' }, { ticks: 0 })
    } else if (path === '/animations/rig') {
      assert(body.spec === 'mixamo', 'rig spec mixamo')
      makeTask(id, { pbr_model: `${CDN}/${id}/rig.glb` })
    } else if (path === '/animations/retarget') {
      assert(Array.isArray(body.animations) && body.animations.length === 3, `retarget sends 3 animations (${JSON.stringify(body.animations)})`)
      const urls = {}
      for (const name of body.animations) urls[name] = `${CDN}/${id}/${name.replace(/[:]/g, '_')}.glb`
      makeTask(id, { model_urls: urls })
      tasks.get(id).credits_consumed = 30
    } else if (path === '/models/convert') {
      makeTask(id, { model: `${CDN}/${id}/out.${String(body.format).toLowerCase()}` })
    } else {
      return json({ code: 2000, message: `unmocked ${path}` }, 400)
    }
    return json({ code: 0, data: { task_id: id } })
  }
  return json({ code: 2000, message: `unmocked ${req.method()} ${path}` }, 400)
}

async function artifactRoute(route) {
  const target = new URL(route.request().url()).searchParams.get('url') || ''
  if (target.endsWith('.jpg')) return route.fulfill({ status: 200, contentType: 'image/jpeg', body: JPG })
  if (target.endsWith('.glb')) return route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: FIXTURE })
  return route.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.from('mock') })
}

// --- Test ------------------------------------------------------------------------------------
const preview = await startPreview()
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
let failed = false
try {
  const context = await browser.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text())
  })
  await page.route('**/generativelanguage.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [] }) }))
  await page.route('**/tripo-api/**', tripoRoute)
  await page.route('**/tripo-cn-api/**', tripoCnRoute)
  await page.route('**/tripo-artifact**', artifactRoute)
  await page.route('https://openapi.tripo3d.ai/**', (r) => r.abort())

  await page.goto(BASE)
  await page.getByPlaceholder('Enter your Google AI API key...').fill('test-google-key')
  await page.getByPlaceholder('Enter your Google AI API key...').locator('xpath=following-sibling::button[1]').click()
  const tripoInput = page.getByPlaceholder('Enter your Tripo API key (tsk_...)')
  const tripoSave = tripoInput.locator('xpath=following-sibling::button[1]')
  await tripoInput.fill('bad-key')
  await tripoSave.click()
  await page.getByText('Tripo rejected this key in both').waitFor()
  assert(!(await page.getByRole('button', { name: 'Refresh balance' }).isVisible()), 'rejected Tripo key is not saved')
  await tripoInput.fill(`Bearer ${CN_KEY}`)
  await tripoSave.click()
  await page.getByText('Tripo key verified (China region)').waitFor()
  assert(cnBalanceCalls >= 1, 'China-region key verified through /tripo-cn-api')
  await tripoInput.fill(` ${GOOD_KEY}\n`)
  await tripoSave.click()
  await page.getByText('Tripo key verified (International region)').waitFor()
  log('tripo key rejected, China key detected, International key verified')
  await page.locator('h3:has-text("Settings")').locator('xpath=..').locator('button').last().click().catch(() => {})
  await page.keyboard.press('Escape')
  // Close the settings modal via its X if still open.
  const closeBtn = page.locator('h2:has-text("Settings"), h3:has-text("Settings")').first().locator('xpath=ancestor::div[1]//button').first()
  if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click()
  log('keys saved')

  // Go to the 3D Studio.
  await page.getByRole('button', { name: '3D Studio' }).first().click()
  await page.getByTestId('studio3d').waitFor()
  await page.getByTestId('three-viewport').waitFor()
  await page.locator('[data-testid="three-viewport"] canvas').waitFor({ timeout: 20000 })
  log('studio mounted')

  // Generate a concept (text-to-model) mesh.
  await page.getByRole('button', { name: 'Generate 3D for Concept (text)' }).click()
  await page.getByTestId('tripo-confirm').waitFor()
  await page.getByPlaceholder(/stylised robot fox/).fill('a tiny grey test cube')
  const estimate = await page.getByTestId('tripo-estimate').textContent()
  assert(/credits/.test(estimate), `mesh estimate rendered (${estimate})`)
  await page.getByTestId('tripo-confirm').click()
  await page.locator('[data-testid^="asset-row-"]').first().waitFor()
  await page.getByText('3D mesh saved in the app.').waitFor({ timeout: 30000 })
  log('mesh job completed')

  // Viewport shows the cube with its spin clip and stats.
  await page.locator('[data-testid="view-chips"] button:has-text("Mesh")').waitFor()
  await page.getByTestId('animation-bar').waitFor({ timeout: 20000 })
  const clipOptions = await page.locator('[data-testid="animation-bar"] select').first().locator('option').allTextContents()
  assert(clipOptions.some((t) => t.startsWith('spin')), `clip list shows spin (${clipOptions})`)
  const stats = await page.getByTestId('stats-panel').textContent()
  assert(/Triangles\s*12/.test(stats.replace(/\s+/g, ' ')), `stats show 12 triangles (${stats})`)
  log('viewport + clips + stats ok')

  // Gizmo via keyboard, snapshot button exists.
  await page.keyboard.press('g')
  assert((await page.getByRole('button', { name: 'Move (G)' }).getAttribute('aria-pressed')) === 'true', 'G toggles translate gizmo')
  await page.keyboard.press('Escape')

  // Rig (free check then rig) and animate (3 clips = 30 credits).
  await page.getByTestId('action-rig').click()
  await page.getByTestId('tripo-confirm').waitFor()
  assert(/~25/.test(await page.getByTestId('tripo-estimate').textContent()), 'rig estimate 25')
  await page.getByTestId('tripo-confirm').click()
  await page.getByText(/Rig ready/).waitFor({ timeout: 30000 })
  log('rig job completed')
  await page.getByTestId('action-animate').click()
  await page.getByTestId('tripo-confirm').waitFor()
  for (const label of ['Idle', 'Walk', 'Run']) await page.getByRole('button', { name: label, exact: true }).click()
  assert(/~30/.test(await page.getByTestId('tripo-estimate').textContent()), 'retarget estimate 30 for 3 clips')
  await page.getByTestId('tripo-confirm').click()
  await page.getByText(/Animations saved/).waitFor({ timeout: 30000 })
  await page.locator('[data-testid="view-chips"] button:has-text("Walk")').waitFor()
  log('retarget job completed')

  // Export bundle → ZIP with GLB + manifest.
  await page.getByTestId('action-export').click()
  await page.getByTestId('export-modal').waitFor()
  const gltf = page.getByTestId('target-gltf')
  if (!(await gltf.isChecked())) await gltf.check()
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByTestId('build-bundle').click()])
  const zipPath = resolve(OUT, 'bundle.zip')
  await download.saveAs(zipPath)
  const zip = await JSZip.loadAsync(readFileSync(zipPath))
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  assert(names.some((n) => /\/model\/glb\/[^/]+\.glb$/.test(n)), `bundle has model/glb (${names.join(', ')})`)
  assert(names.some((n) => /\/model\/glb\/[^/]+_rigged\.glb$/.test(n)), 'bundle has rigged glb')
  assert(names.filter((n) => /\/animations\/[^/]+@(idle|walk|run)\.glb$/.test(n)).length === 3, 'bundle has 3 clips')
  assert(names.some((n) => n.endsWith('/manifest.json')), 'bundle has manifest.json')
  const manifest = JSON.parse(await zip.file(names.find((n) => n.endsWith('/manifest.json'))).async('string'))
  assert(manifest.rig?.spec === 'mixamo', 'manifest records the rig')
  assert(manifest.animations.length === 3, 'manifest lists 3 clips')
  log('export bundle ok:', names.length, 'files')

  // Reload: the character was auto-saved; load it from the Library and the files come back from IndexedDB.
  await page.reload()
  await page.getByRole('button', { name: 'Library' }).first().click()
  await page.getByRole('button', { name: 'Load' }).first().click()
  await page.getByRole('button', { name: '3D Studio' }).first().click()
  await page.locator('[data-testid^="asset-row-"]').first().waitFor()
  await page.getByTestId('animation-bar').waitFor({ timeout: 20000 })
  assert((await page.locator('[data-testid="view-chips"] button').count()) >= 5, 'files survive reload')
  log('persistence ok')

  await page.screenshot({ path: resolve(OUT, 'studio.png') })
  const realErrors = errors.filter((e) => !/WebGL|GPU|swiftshader|GroupMarkerNotSet|ERR_CERT|Failed to load resource/i.test(e))
  assert(realErrors.length === 0, `no page errors: ${realErrors.join(' | ')}`)
  log('PASS')
} catch (e) {
  failed = true
  console.error('[smoke] FAIL', e)
  try {
    const pages = browser.contexts().flatMap((c) => c.pages())
    if (pages[0]) await pages[0].screenshot({ path: resolve(OUT, 'failure.png') })
  } catch { /* ignore */ }
} finally {
  await browser.close()
  preview.kill()
}
process.exit(failed ? 1 : 0)
