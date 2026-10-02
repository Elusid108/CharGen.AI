import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  resolveTripoBase, resolveTripoTransportStatus, resolveArtifactFetchUrl, normalizeProxyUrl, configureTripoTransport,
  tripoRequest, uploadTripoFile, waitForTripoTask, listTripoTasks, getTripoBalance, TripoApiError,
} from './tripo'

function reply(status, body, headers = {}) {
  return { ok: status >= 200 && status < 300, status, headers: { get: (k) => headers[k] ?? null }, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }
}

beforeEach(() => configureTripoTransport({ proxyUrl: '' }))
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('transport resolution', () => {
  it('base url matrix', () => {
    expect(resolveTripoBase({ proxyUrl: 'https://p.workers.dev/', hostname: 'elusid108.github.io' })).toBe('https://p.workers.dev/v3')
    expect(resolveTripoBase({ hostname: 'localhost' })).toBe('/tripo-api')
    expect(resolveTripoBase({ hostname: '127.0.0.1' })).toBe('/tripo-api')
    expect(resolveTripoBase({ hostname: 'elusid108.github.io' })).toBe('https://openapi.tripo3d.ai/v3')
    expect(resolveTripoTransportStatus({ proxyUrl: 'https://p.workers.dev' })).toBe('custom-proxy')
    expect(resolveTripoTransportStatus({ hostname: 'localhost' })).toBe('local-proxy')
    expect(resolveTripoTransportStatus({ hostname: 'x.io' })).toBe('direct-blocked')
  })

  it('normalizeProxyUrl accepts https and local http only', () => {
    expect(normalizeProxyUrl('  https://a.b/ ')).toBe('https://a.b')
    expect(normalizeProxyUrl('http://localhost:8787/')).toBe('http://localhost:8787')
    expect(normalizeProxyUrl('http://evil.com')).toBe('')
    expect(normalizeProxyUrl('ftp://x')).toBe('')
    expect(normalizeProxyUrl('')).toBe('')
  })

  it('artifact url matrix', () => {
    const u = 'https://cdn.tripo3d.ai/x.glb?sig=1'
    expect(resolveArtifactFetchUrl(u, { proxyUrl: 'https://p.dev' })).toBe(`https://p.dev/artifact?url=${encodeURIComponent(u)}`)
    expect(resolveArtifactFetchUrl(u, { hostname: 'localhost' })).toBe(`/tripo-artifact?url=${encodeURIComponent(u)}`)
    expect(resolveArtifactFetchUrl(u, { hostname: 'x.io' })).toBe(u)
    expect(resolveArtifactFetchUrl('', {})).toBe('')
  })
})

describe('tripoRequest', () => {
  it('retries 429 with Retry-After then succeeds, unwrapping data', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply(429, { code: 429 }, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(reply(200, { code: 0, data: { balance: 12, frozen: 3 } }))
    vi.stubGlobal('fetch', fetchMock)
    const p = getTripoBalance('key')
    await vi.advanceTimersByTimeAsync(1000)
    expect(await p).toEqual({ balance: 12, frozen: 3 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer key')
  })

  it('surfaces Tripo error envelopes and refuses without a key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, { code: 2010, message: 'insufficient credits', suggestion: 'top up' })))
    await expect(tripoRequest('GET', '/account/balance', { apiKey: 'k' })).rejects.toMatchObject({ name: 'TripoApiError', code: 2010, suggestion: 'top up' })
    await expect(tripoRequest('GET', '/x', { apiKey: '' })).rejects.toBeInstanceOf(TripoApiError)
  })

  it('turns a network TypeError into a CORS hint when direct', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(tripoRequest('GET', '/x', { apiKey: 'k' })).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/proxy/i) })
  })

  it('uses the configured proxy base', async () => {
    configureTripoTransport({ proxyUrl: 'https://p.dev/' })
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { code: 0, data: { file_token: 'tok' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('FormData', class { append() {} })
    expect(await uploadTripoFile('k', { name: 'a.jpg' })).toBe('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('https://p.dev/v3/files')
  })
})

describe('polling', () => {
  it('waitForTripoTask resolves on success and reports progress', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply(200, { code: 0, data: { task_id: 't', status: 'running', progress: 40 } }))
      .mockResolvedValueOnce(reply(200, { code: 0, data: { task_id: 't', status: 'success', progress: 100, output: {} } }))
    vi.stubGlobal('fetch', fetchMock)
    const seen = []
    const p = waitForTripoTask('k', 't', { onProgress: (t) => seen.push(t.progress), intervalMs: 50 })
    await vi.advanceTimersByTimeAsync(60)
    const task = await p
    expect(task.status).toBe('success')
    expect(seen).toEqual([40, 100])
  })

  it('fails on expired and aborts mid-poll', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, { code: 0, data: { task_id: 't', status: 'expired' } })))
    await expect(waitForTripoTask('k', 't')).rejects.toMatchObject({ name: 'TripoTaskError', status: 'expired' })

    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, { code: 0, data: { task_id: 't', status: 'running' } })))
    const ac = new AbortController()
    const p = waitForTripoTask('k', 't', { signal: ac.signal, intervalMs: 1000 })
    const settled = p.catch((e) => e)
    await vi.advanceTimersByTimeAsync(10)
    ac.abort()
    const err = await settled
    expect(err.name).toBe('AbortError')
  })

  it('listTripoTasks normalizes array and object shapes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, { code: 0, data: { tasks: [{ task_id: 'a', status: 'success' }, { task_id: 'b', status: 'failed' }] } })))
    const m = await listTripoTasks('k', ['a', 'b', 'a', null])
    expect([...m.keys()]).toEqual(['a', 'b'])
    expect((await listTripoTasks('k', [])).size).toBe(0)
  })
})
