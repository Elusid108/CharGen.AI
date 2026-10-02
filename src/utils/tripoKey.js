/**
 * Tripo key hygiene and verification. Pure: the balance probe is injected, so this runs in node.
 *
 * Why a key gets "rejected": Tripo answers code 1002 both for a bad key and for a good key sent to
 * the wrong region (a key lives in exactly one of openapi.tripo3d.ai / openapi.tripo3d.com). So a
 * key is probed against its region before it is saved, and only an explicit auth answer counts as
 * a verdict on the key — CORS, an unreachable relay, or a 5xx says nothing about it.
 */

import { TRIPO_REGIONS } from './tripo'
import { formatCredits } from './tripoCredits'

const INVISIBLE = /[\s\u200B-\u200D\u2060\uFEFF]+/g

/** Strips what people paste around a key: `Bearer `, `TRIPO_API_KEY=`, quotes, stray whitespace. */
export function normalizeTripoKey(raw) {
  let s = String(raw ?? '').trim()
  s = s.replace(/^(?:export\s+)?TRIPO_API_KEY\s*[=:]\s*/i, '')
  s = s.replace(/^Authorization\s*:\s*/i, '')
  s = s.replace(/^Bearer\s+/i, '')
  s = s.replace(/^['"`]+|['"`]+$/g, '')
  return s.replace(INVISIBLE, '')
}

/** '' when the key looks like a Tripo key, otherwise a hint about what was pasted instead. */
export function tripoKeyFormatWarning(key) {
  const k = String(key || '')
  if (!k) return ''
  if (/^tsk_[A-Za-z0-9_-]{8,}$/.test(k)) return ''
  if (/^AIza/.test(k)) return 'That looks like a Google API key; Tripo keys start with tsk_.'
  return 'Tripo API keys start with tsk_.'
}

/** True only when Tripo itself refused the key (code 1002 / HTTP 401). */
export function isTripoAuthError(err) {
  return err?.code === 1002 || err?.status === 401
}

/**
 * Probe the preferred region, then the other one only if the first explicitly rejected the key.
 * An unreachable first region stops the search: the second goes through the same relay.
 * @param {string} key
 * @param {(region: 'ov'|'cn') => Promise<{ balance: number, frozen: number }>} probe
 * @returns {Promise<{ ok: true, region: string, balance: object } | { ok: false, failures: object }>}
 */
export async function detectTripoRegion(key, probe, { prefer = 'ov' } = {}) {
  const order = prefer === 'cn' ? ['cn', 'ov'] : ['ov', 'cn']
  const failures = {}
  if (!key) return { ok: false, failures }
  for (const region of order) {
    try {
      const balance = await probe(region)
      return { ok: true, region, balance }
    } catch (error) {
      const verdict = isTripoAuthError(error) ? 'rejected' : 'unreachable'
      failures[region] = { verdict, error }
      if (verdict === 'unreachable') break
    }
  }
  return { ok: false, failures }
}

/**
 * What the Settings Save button should do with a probe result.
 * @returns {{ save: boolean, level: 'success'|'warning'|'error', message: string }}
 */
export function describeTripoKeyCheck(result, { key = '', transportStatus = 'direct-blocked' } = {}) {
  if (result?.ok) {
    const label = TRIPO_REGIONS[result.region]?.label || result.region
    return {
      save: true,
      level: 'success',
      message: `Tripo key verified (${label} region) — ${formatCredits(result.balance?.balance)} credits available`,
    }
  }
  const failures = result?.failures || {}
  const entries = Object.entries(failures)
  const formatHint = tripoKeyFormatWarning(key)

  if (entries.length && entries.every(([, f]) => f.verdict === 'rejected')) {
    return {
      save: false,
      level: 'error',
      message: [
        'Tripo rejected this key in both the International and China regions, so it was not saved.',
        formatHint || 'Copy it again from your Tripo API keys page; a revoked or partially copied key fails this way.',
      ].join(' '),
    }
  }

  const unreachable = entries.find(([, f]) => f.verdict === 'unreachable')
  const rejectedOv = failures.ov?.verdict === 'rejected'
  let reason
  if (transportStatus === 'direct-blocked') {
    reason = 'this host has no Tripo relay, so the browser blocks the call (CORS). Run CharGen locally or set a Tripo proxy URL below.'
  } else if (rejectedOv && unreachable?.[0] === 'cn' && transportStatus === 'custom-proxy') {
    reason = 'the International region rejected it and your proxy has no China route. Redeploy the Worker in proxy/ to check China-region keys.'
  } else {
    reason = unreachable?.[1]?.error?.message || 'Tripo could not be reached.'
  }
  return {
    save: true,
    level: 'warning',
    message: `Tripo key saved but not verified: ${reason}${formatHint ? ` ${formatHint}` : ''}`,
  }
}
