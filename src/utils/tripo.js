/**
 * Thin Tripo OpenAPI v3 client. Browser fetch only — no official SDK.
 * Transport 429/5xx retries are free. A new successful generation always costs full price.
 */

export const TRIPO_UPSTREAM = 'https://openapi.tripo3d.ai/v3'
export const TRIPO_BASE = TRIPO_UPSTREAM

function getTripoBase() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') return '/tripo-api'
  }
  return TRIPO_UPSTREAM
}

const POLL_MS = 2000
const TASK_TIMEOUT_MS = 8 * 60 * 1000
const MAX_HTTP_RETRIES = 5

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryWaitMs(res, attempt) {
  const header = res?.headers?.get?.('Retry-After')
  const fromHeader = Number(header)
  if (Number.isFinite(fromHeader) && fromHeader >= 0) return Math.min(fromHeader * 1000, 30000)
  return Math.min(1000 * 2 ** attempt, 16000)
}

function authHeaders(apiKey, extra = {}) {
  return {
    Authorization: `Bearer ${apiKey}`,
    ...extra,
  }
}

async function parseBody(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

/**
 * @param {string} method
 * @param {string} path
 * @param {{ apiKey: string, json?: unknown, formData?: FormData }} opts
 */
export async function tripoRequest(method, path, { apiKey, json, formData }) {
  const key = String(apiKey || '').trim()
  if (!key) throw new TripoApiError('Tripo API key is missing. Add it in Settings.')

  const url = path.startsWith('http') ? path : `${getTripoBase()}${path}`
  let lastError = null

  for (let attempt = 0; attempt < MAX_HTTP_RETRIES; attempt++) {
    const headers = formData
      ? authHeaders(key)
      : authHeaders(key, { 'Content-Type': 'application/json' })

    let res
    try {
      res = await fetch(url, {
        method,
        headers,
        body: formData ? formData : json !== undefined ? JSON.stringify(json) : undefined,
      })
    } catch (e) {
      lastError = e
      if (e?.name !== 'TypeError' && attempt < MAX_HTTP_RETRIES - 1) {
        await sleep(1000 * 2 ** attempt)
        continue
      }
      throw new TripoApiError(e?.message || 'Network error talking to Tripo', { status: 0 })
    }

    if (res.status === 429 || res.status >= 500) {
      lastError = new TripoApiError(`Tripo HTTP ${res.status}`, { status: res.status })
      if (attempt < MAX_HTTP_RETRIES - 1) {
        await sleep(retryWaitMs(res, attempt))
        continue
      }
    }

    const body = await parseBody(res)
    if (!res.ok || (body && body.code && body.code !== 0)) {
      const message = body.message || body.error || `Tripo request failed (${res.status})`
      const suggestion = body.suggestion || ''
      throw new TripoApiError(suggestion ? `${message} ${suggestion}` : message, {
        code: body.code,
        suggestion,
        status: res.status,
      })
    }

    return body.data ?? body
  }

  throw lastError || new TripoApiError('Tripo request failed after retries')
}

export async function getTripoBalance(apiKey) {
  const data = await tripoRequest('GET', '/account/balance', { apiKey })
  return {
    balance: Number(data?.balance) || 0,
    frozen: Number(data?.frozen) || 0,
  }
}

export async function uploadTripoFile(apiKey, file) {
  const formData = new FormData()
  formData.append('file', file)
  const data = await tripoRequest('POST', '/files', { apiKey, formData })
  const token = data?.file_token
  if (!token) throw new TripoApiError('Tripo upload did not return a file_token')
  return token
}

export async function createTripoTask(apiKey, path, payload) {
  const data = await tripoRequest('POST', path, { apiKey, json: payload })
  const taskId = data?.task_id
  if (!taskId) throw new TripoApiError('Tripo did not return a task_id')
  return taskId
}

export async function getTripoTask(apiKey, taskId) {
  return tripoRequest('GET', `/tasks/${encodeURIComponent(taskId)}`, { apiKey })
}

/**
 * @param {string} apiKey
 * @param {string} taskId
 * @param {{ onProgress?: (task: object) => void, intervalMs?: number, timeoutMs?: number }} [opts]
 */
export async function waitForTripoTask(apiKey, taskId, opts = {}) {
  const intervalMs = opts.intervalMs ?? POLL_MS
  const timeoutMs = opts.timeoutMs ?? TASK_TIMEOUT_MS
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const task = await getTripoTask(apiKey, taskId)
    opts.onProgress?.(task)
    const status = task?.status
    if (status === 'success') return task
    if (status === 'failed' || status === 'cancelled' || status === 'banned') {
      throw new TripoTaskError(task)
    }
    await sleep(intervalMs)
  }

  throw new TripoApiError('Timed out waiting for Tripo. The job may still finish — check again in a few minutes.')
}

export function extractArtifactUrls(output) {
  const out = output && typeof output === 'object' ? output : {}
  const modelUrl = out.model_url || out.pbr_model || out.model || out.base_model || null
  const previewUrl = out.rendered_image_url || out.rendered_image || null
  return { modelUrl, previewUrl }
}

/**
 * Artifact CDNs often omit CORS. Returns a Blob or null if the browser cannot read the bytes.
 * @param {string} url
 * @returns {Promise<Blob | null>}
 */
export async function fetchArtifactBlob(url) {
  if (!url) return null
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) return null
    return await res.blob()
  } catch {
    return null
  }
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

export function generationPayload({ engineId, texture, extra = {} }) {
  const isP1 = engineId === 'p1'
  const payload = {
    model: isP1 ? 'P1-20260311' : 'v3.1-20260211',
    texture: !!texture,
    pbr: !!texture,
    ...extra,
  }
  if (isP1) {
    payload.face_limit = 5000
    payload.auto_size = true
  }
  return payload
}
