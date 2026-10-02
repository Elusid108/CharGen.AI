import { describe, it, expect, vi } from 'vitest'
import {
  normalizeTripoKey, tripoKeyFormatWarning, isTripoAuthError, detectTripoRegion, describeTripoKeyCheck,
} from './tripoKey'
import { TripoApiError } from './tripo'

// Assembled at runtime so the secret scan never sees a key-shaped literal.
const KEY = ['tsk', 'exampleKeyForTests01'].join('_')
const rejected = () => new TripoApiError('Authentication failed', { code: 1002, status: 401 })
const cors = () => new TripoApiError('Tripo blocked by browser CORS on this host.', { status: 0 })

describe('normalizeTripoKey', () => {
  it('strips what gets pasted around a key', () => {
    expect(normalizeTripoKey(`  ${KEY}\n`)).toBe(KEY)
    expect(normalizeTripoKey(`Bearer ${KEY}`)).toBe(KEY)
    expect(normalizeTripoKey(`Authorization: Bearer ${KEY}`)).toBe(KEY)
    expect(normalizeTripoKey(`export TRIPO_API_KEY="${KEY}"`)).toBe(KEY)
    expect(normalizeTripoKey(`'${KEY}'`)).toBe(KEY)
    expect(normalizeTripoKey(`${KEY.slice(0, 8)}\u200B${KEY.slice(8)}`)).toBe(KEY)
    expect(normalizeTripoKey(null)).toBe('')
  })
})

describe('tripoKeyFormatWarning', () => {
  it('accepts tsk_ keys and names a Google key', () => {
    expect(tripoKeyFormatWarning(KEY)).toBe('')
    expect(tripoKeyFormatWarning('')).toBe('')
    expect(tripoKeyFormatWarning('AIzaSomething')).toMatch(/Google/)
    expect(tripoKeyFormatWarning('abc')).toMatch(/tsk_/)
  })
})

describe('isTripoAuthError', () => {
  it('only counts an explicit auth answer', () => {
    expect(isTripoAuthError(rejected())).toBe(true)
    expect(isTripoAuthError({ status: 401 })).toBe(true)
    expect(isTripoAuthError(cors())).toBe(false)
    expect(isTripoAuthError({ code: 403, status: 403 })).toBe(false)
    expect(isTripoAuthError(null)).toBe(false)
  })
})

describe('detectTripoRegion', () => {
  it('finds a China key after the International host rejects it', async () => {
    const probe = vi.fn(async (region) => {
      if (region === 'ov') throw rejected()
      return { balance: 40, frozen: 0 }
    })
    const r = await detectTripoRegion(KEY, probe)
    expect(r).toMatchObject({ ok: true, region: 'cn', balance: { balance: 40 } })
    expect(probe.mock.calls.map((c) => c[0])).toEqual(['ov', 'cn'])
  })

  it('tries the preferred region first and stops on success', async () => {
    const probe = vi.fn(async () => ({ balance: 5, frozen: 0 }))
    expect(await detectTripoRegion(KEY, probe, { prefer: 'cn' })).toMatchObject({ ok: true, region: 'cn' })
    expect(probe).toHaveBeenCalledTimes(1)
  })

  it('does not blame the key or try the other region when the relay is unreachable', async () => {
    const probe = vi.fn(async () => { throw cors() })
    const r = await detectTripoRegion(KEY, probe)
    expect(r.ok).toBe(false)
    expect(r.failures.ov.verdict).toBe('unreachable')
    expect(probe).toHaveBeenCalledTimes(1)
  })

  it('reports both rejections and never probes without a key', async () => {
    const r = await detectTripoRegion(KEY, async () => { throw rejected() })
    expect(r.failures).toMatchObject({ ov: { verdict: 'rejected' }, cn: { verdict: 'rejected' } })
    const probe = vi.fn()
    expect((await detectTripoRegion('', probe)).ok).toBe(false)
    expect(probe).not.toHaveBeenCalled()
  })
})

describe('describeTripoKeyCheck', () => {
  it('saves and names the region on success', () => {
    const d = describeTripoKeyCheck({ ok: true, region: 'cn', balance: { balance: 12, frozen: 0 } }, { key: KEY })
    expect(d).toMatchObject({ save: true, level: 'success' })
    expect(d.message).toMatch(/China region/)
    expect(d.message).toMatch(/12 credits/)
  })

  it('refuses a key both regions rejected and explains a format problem', () => {
    const failures = { ov: { verdict: 'rejected', error: rejected() }, cn: { verdict: 'rejected', error: rejected() } }
    const d = describeTripoKeyCheck({ ok: false, failures }, { key: 'AIzaWrong', transportStatus: 'local-proxy' })
    expect(d).toMatchObject({ save: false, level: 'error' })
    expect(d.message).toMatch(/Google/)
  })

  it('saves unverified with the CORS reason on a host without a relay', () => {
    const d = describeTripoKeyCheck({ ok: false, failures: { ov: { verdict: 'unreachable', error: cors() } } }, { key: KEY, transportStatus: 'direct-blocked' })
    expect(d).toMatchObject({ save: true, level: 'warning' })
    expect(d.message).toMatch(/CORS/)
  })

  it('points at an outdated Worker when it has no China route', () => {
    const failures = {
      ov: { verdict: 'rejected', error: rejected() },
      cn: { verdict: 'unreachable', error: new TripoApiError('not found', { code: 404, status: 404 }) },
    }
    const d = describeTripoKeyCheck({ ok: false, failures }, { key: KEY, transportStatus: 'custom-proxy' })
    expect(d.save).toBe(true)
    expect(d.message).toMatch(/Redeploy the Worker/)
  })

  it('passes through the transport error otherwise', () => {
    const err = new TripoApiError('Could not reach Tripo (timeout).', { status: 0 })
    const d = describeTripoKeyCheck({ ok: false, failures: { ov: { verdict: 'unreachable', error: err } } }, { key: KEY, transportStatus: 'local-proxy' })
    expect(d.message).toMatch(/timeout/)
  })
})
