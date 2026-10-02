/**
 * Thin Tripo OpenAPI v3 client. Browser fetch only — no official SDK.
 * Transport 429/5xx retries are free. A new successful generation always costs full price.
 *
 * Store-free: the character store calls `configureTripoTransport({ proxyUrl })` when the user
 * sets a proxy; everything else here is pure enough to test in node with a stubbed fetch.
 */

import { buildGenerationPayload, modelForEngine, TRIPO_ROUTES, TRIPO_FAILED } from './tripoEndpoints'

export const TRIPO_UPSTREAM = 'https://openapi.tripo3d.ai/v3'
export const TRIPO_BASE = TRIPO_UPSTREAM
/** Tripo artifact links stop working a few minutes after a task finishes. */
export const ARTIFACT_TTL_MS = 5 * 60 * 1000

const POLL_MS = 2000
const TASK_TIMEOUT_MS = 8 * 60 * 1000
const MAX_HTTP_RETRIES = 5

const transport = { proxyUrl: '' }

export function normalizeProxyUrl(raw) {
  const s = String(raw || '').trim().replace(/\/+$/, '')
  if (!s) return ''
  if (!/^https:\/\/[^\s/]+/i.test(s) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(s)) return ''
  return s
}

export function configureTripoTransport({ proxyUrl } = {}) {
  transport.proxyUrl = normalizeProxyUrl(proxyUrl)
  return { ...transport }
}

export function getTripoTransport() {
  return { ...transport }
}

function currentHostname() {
  if (typeof window === 'undefined') return ''
  return window.location?.hostname || ''
}

function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

/** Pure: which base URL a request should use. */
export function resolveTripoBase({ proxyUrl = '', hostname = '' } = {}) {
  const proxy = normalizeProxyUrl(proxyUrl)
  if (proxy) return `${proxy}/v3`
  if (isLocalHostname(hostname)) return '/tripo-api'
  return TRIPO_UPSTREAM
}

/** 'custom-proxy' | 'local-proxy' | 'direct-blocked' (browser CORS will refuse direct calls). */
export function resolveTripoTransportStatus({ proxyUrl = '', hostname = '' } = {}) {
  if (normalizeProxyUrl(proxyUrl)) return 'custom-proxy'
  if (isLocalHostname(hostname)) return 'local-proxy'
  return 'direct-blocked'
}

export function tripoTransportStatus() {
  return resolveTripoTransportStatus({ proxyUrl: transport.proxyUrl, hostname: currentHostname() })
}

function getTripoBase() {
  return resolveTripoBase({ proxyUrl: transport.proxyUrl, hostname: currentHostname() })
}

export class TripoApiError extends Error {
  constructor(message, { code, suggestion, status } = {}) {
    super(message)
    this.name = 'TripoApiError'
    this.code = code ?? null
    this.suggestion = suggestion || ''
    this.status = status ?? null
  }
}

export class TripoTaskError extends Error {
  constructor(task) {
    const status = task?.status || 'failed'
    super(task?.error_msg || task?.message || `Tripo task ${status}`)
    this.name = 'TripoTaskError'
    this.task = task
    this.status = status
  }
}

export class TripoAbortError extends Error {
  constructor(message = 'Tripo job cancelled') {
    super(message)
    this.name = 'AbortError'
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new TripoAbortError()
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new TripoAbortError())
    const t = setTimeout(() => {
      signal?.removeEventListener?.('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(new TripoAbortError())
    }
    signal?.addEventListener?.('abort', onAbort, { once: true })
  })
}

function retryWaitMs(res, attempt) {
  const header = res?.headers?.get?.('Retry-After')
  const fromHeader = Number(header)
  if (Number.isFinite(fromHeader) && fromHeader >= 0) return Math.min(fromHeader * 1000, 30000)
  return Math.min(1000 * 2 ** attempt, 16000)
}

function authHeaders(apiKey, extra = {}) {
  return { Authorization: `Bearer ${apiKey}`, ...extra }
}

async function parseBody(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

export function corsBlockedMessage() {
  return 'Tripo blocked by browser CORS on this host. Run CharGen locally, or deploy the proxy Worker and set its URL in Settings (see proxy/README.md).'
}

/**
 * @param {'GET'|'POST'} method
 * @param {string} path — relative to the v3 base
 * @param {{ apiKey: string, json?: object, formData?: FormData, signal?: AbortSignal }} opts
 */
export async function tripoRequest(method, path, { apiKey, json, formData, signal } = {}) {
  if (!apiKey) throw new TripoApiError('Add your Tripo API key in Settings first.')
  const url = `${getTripoBase()}${path}`
  const headers = authHeaders(apiKey, json ? { 'Content-Type': 'application/json' } : {})
  let attempt = 0
  for (;;) {
    throwIfAborted(signal)
    let res
    try {
      res = await fetch(url, {
        method,
        headers,
        body: json ? JSON.stringify(json) : formData || undefined,
        signal,
      })
    } catch (e) {
      if (e?.name === 'AbortError') throw new TripoAbortError()
      const blocked = tripoTransportStatus() === 'direct-blocked'
      throw new TripoApiError(blocked ? corsBlockedMessage() : `Could not reach Tripo (${e?.message || 'network error'}).`, { status: 0 })
    }
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_HTTP_RETRIES) {
      await sleep(retryWaitMs(res, attempt), signal)
      attempt += 1
      continue
    }
    const body = await parseBody(res)
    if (!res.ok || (body && typeof body.code === 'number' && body.code !== 0)) {
      const message = body?.message || body?.error || `Tripo request failed (${res.status})`
      throw new TripoApiError(message, { code: body?.code ?? res.status, suggestion: body?.suggestion, status: res.status })
    }
    return body?.data ?? body
  }
}

export async function getTripoBalance(apiKey, opts = {}) {
  const data = await tripoRequest('GET', TRIPO_ROUTES.balance, { apiKey, signal: opts.signal })
  return { balance: Number(data?.balance) || 0, frozen: Number(data?.frozen) || 0 }
}

export async function uploadTripoFile(apiKey, file, opts = {}) {
  const formData = new FormData()
  formData.append('file', file, file?.name || 'upload.bin')
  const data = await tripoRequest('POST', TRIPO_ROUTES.files, { apiKey, formData, signal: opts.signal })
  const token = data?.file_token || data?.image_token
  if (!token) throw new TripoApiError('Tripo upload returned no file token.')
  return token
}

export async function createTripoTask(apiKey, path, payload, opts = {}) {
  const data = await tripoRequest('POST', path, { apiKey, json: payload, signal: opts.signal })
  const taskId = data?.task_id
  if (!taskId) throw new TripoApiError('Tripo did not return a task id.')
  return taskId
}

export async function getTripoTask(apiKey, taskId, opts = {}) {
  return tripoRequest('GET', TRIPO_ROUTES.task(taskId), { apiKey, signal: opts.signal })
}

/** Batch status for resume-on-reload. Returns a Map(taskId → task). */
export async function listTripoTasks(apiKey, taskIds, opts = {}) {
  const ids = [...new Set((taskIds || []).filter(Boolean))]
  const map = new Map()
  if (!ids.length) return map
  const data = await tripoRequest('POST', TRIPO_ROUTES.tasksList, { apiKey, json: { task_ids: ids }, signal: opts.signal })
  const rows = Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : data && typeof data === 'object' ? Object.values(data) : []
  for (const task of rows) if (task?.task_id) map.set(task.task_id, task)
  return map
}

/**
 * Poll until terminal. Throws TripoTaskError on failed/cancelled/banned/expired/unknown,
 * TripoAbortError when `signal` aborts, TripoApiError on timeout.
 */
export async function waitForTripoTask(apiKey, taskId, { onProgress, intervalMs = POLL_MS, timeoutMs = TASK_TIMEOUT_MS, signal } = {}) {
  const started = Date.now()
  for (;;) {
    throwIfAborted(signal)
    const task = await getTripoTask(apiKey, taskId, { signal })
    if (onProgress) onProgress(task)
    if (task?.status === 'success') return task
    if (TRIPO_FAILED.includes(task?.status)) throw new TripoTaskError(task)
    if (Date.now() - started > timeoutMs) {
      throw new TripoApiError('Timed out waiting for Tripo. The job may still finish — check again in a few minutes.')
    }
    await sleep(intervalMs, signal)
  }
}

export function extractArtifactUrls(output) {
  const out = output && typeof output === 'object' ? output : {}
  const modelUrl = out.model_url || out.pbr_model || out.model || out.base_model || null
  const previewUrl = out.rendered_image_url || out.rendered_image || null
  const modelUrls = out.model_urls && typeof out.model_urls === 'object' ? out.model_urls : null
  return { modelUrl, previewUrl, modelUrls }
}

/** Pure: how to fetch a CDN artifact for the current transport. */
export function resolveArtifactFetchUrl(url, { proxyUrl = '', hostname = '' } = {}) {
  if (!url) return url
  const proxy = normalizeProxyUrl(proxyUrl)
  if (proxy) return `${proxy}/artifact?url=${encodeURIComponent(url)}`
  if (isLocalHostname(hostname)) return `/tripo-artifact?url=${encodeURIComponent(url)}`
  return url
}

export function artifactFetchUrl(url) {
  return resolveArtifactFetchUrl(url, { proxyUrl: transport.proxyUrl, hostname: currentHostname() })
}

/**
 * Artifact CDNs often omit CORS. Goes through the Vite proxy on localhost or the user's Worker.
 * @returns {Promise<Blob | null>}
 */
export async function fetchArtifactBlob(url, { signal } = {}) {
  if (!url) return null
  try {
    const res = await fetch(artifactFetchUrl(url), { mode: 'cors', credentials: 'omit', signal })
    if (!res.ok) return null
    return await res.blob()
  } catch (e) {
    if (e?.name === 'AbortError') throw new TripoAbortError()
    return null
  }
}

export function artifactExpiresAt(now = Date.now()) {
  return now + ARTIFACT_TTL_MS
}

export function openArtifactInTab(url) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function saveBlobFile(blob, filename) {
  const link = document.createElement('a')
  const href = URL.createObjectURL(blob)
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(href), 2000)
}

/** Legacy shape used by the current UI; delegates to the registry builder. */
export function generationPayload({ engineId, texture, textureQuality = 'standard', geometryQuality = 'standard', faceLimit, extra = {} }) {
  return buildGenerationPayload({
    model: modelForEngine(engineId),
    texture,
    textureQuality,
    geometryQuality,
    faceLimit: engineId === 'p1' ? faceLimit : undefined,
    extra,
  })
}
