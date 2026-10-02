/**
 * Rig profiles describe what a physical animatronic build can do — its channels,
 * which canonical expressions/gestures it supports, and its timing limits.
 *
 * A rig is orthogonal to a character: the same character can be tried against several
 * rigs, and many characters can share one. User-authored rigs are plain JSON validated
 * by `validateRigProfile`; the id vocabulary is fixed in `motionVocabulary.js`.
 */

import {
  CANONICAL_EXPRESSIONS,
  CANONICAL_GESTURES,
  EXPRESSION_IDS,
  GESTURE_IDS,
} from '../motionVocabulary'
import headOnly3dof from './presets/head-only-3dof.json'
import bust8dof from './presets/bust-8dof.json'
import fullBody12dof from './presets/full-body-12dof.json'

export const RIG_PROFILE_SCHEMA_VERSION = 1

export const CHANNEL_GROUPS = ['head', 'face', 'arm', 'body', 'other']
export const CHANNEL_UNITS = ['deg', 'percent']

export const DEFAULT_RIG_PROFILE_ID = 'reference_rig'

const DEFAULT_CONSTRAINTS = {
  maxSimultaneousChannels: 8,
  maxEventsPerMinute: 90,
  minGapMsBetweenExpressionChanges: 300,
  minGapMsBetweenGestures: 450,
  speechSyncSupported: true,
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/**
 * Permissive reference rig: every canonical id supported. Used when the user has not
 * chosen a rig so motion generation works out of the box.
 */
export const DEFAULT_RIG_PROFILE = Object.freeze({
  id: DEFAULT_RIG_PROFILE_ID,
  schemaVersion: RIG_PROFILE_SCHEMA_VERSION,
  name: 'Reference rig (all motions)',
  description: 'Hardware-agnostic reference. Every canonical expression and gesture is allowed. Pick or author a real rig to constrain output.',
  builtin: true,
  channels: [],
  expressionVocabulary: CANONICAL_EXPRESSIONS.map((e) => ({
    id: e.id,
    supported: true,
    channelTargets: {},
    intensityCapable: true,
    minHoldMs: 300,
  })),
  gestureVocabulary: CANONICAL_GESTURES.map((g) => ({
    id: g.id,
    supported: true,
    durationMsHint: g.tags.includes('loopable') ? 3000 : 800,
    loopable: g.tags.includes('loopable'),
    category: g.tags[0] || 'other',
  })),
  constraints: { ...DEFAULT_CONSTRAINTS },
})

/**
 * Structural validation with field-level error messages.
 * @param {unknown} raw
 * @returns {{ ok: true, profile: object, errors: [] } | { ok: false, profile: null, errors: string[] }}
 */
export function validateRigProfile(raw) {
  const errors = []
  if (!isPlainObject(raw)) {
    return { ok: false, profile: null, errors: ['Rig profile must be a JSON object.'] }
  }

  if (typeof raw.id !== 'string' || !raw.id.trim()) errors.push('`id` must be a non-empty string.')
  if (typeof raw.name !== 'string' || !raw.name.trim()) errors.push('`name` must be a non-empty string.')
  if (raw.schemaVersion != null && num(raw.schemaVersion, NaN) !== RIG_PROFILE_SCHEMA_VERSION) {
    errors.push(`\`schemaVersion\` must be ${RIG_PROFILE_SCHEMA_VERSION}.`)
  }

  if (!Array.isArray(raw.channels)) {
    errors.push('`channels` must be an array (it may be empty).')
  } else {
    const seen = new Set()
    raw.channels.forEach((ch, i) => {
      const at = `channels[${i}]`
      if (!isPlainObject(ch)) { errors.push(`${at} must be an object.`); return }
      if (typeof ch.id !== 'string' || !ch.id.trim()) errors.push(`${at}.id must be a non-empty string.`)
      else if (seen.has(ch.id)) errors.push(`${at}.id "${ch.id}" is duplicated.`)
      else seen.add(ch.id)
      if (ch.group != null && !CHANNEL_GROUPS.includes(ch.group)) {
        errors.push(`${at}.group must be one of ${CHANNEL_GROUPS.join(', ')}.`)
      }
      if (ch.units != null && !CHANNEL_UNITS.includes(ch.units)) {
        errors.push(`${at}.units must be one of ${CHANNEL_UNITS.join(', ')}.`)
      }
      if (!Array.isArray(ch.range) || ch.range.length !== 2 || !Number.isFinite(Number(ch.range[0])) || !Number.isFinite(Number(ch.range[1]))) {
        errors.push(`${at}.range must be [min, max] numbers.`)
      } else if (Number(ch.range[0]) >= Number(ch.range[1])) {
        errors.push(`${at}.range min must be less than max.`)
      } else if (ch.restValue != null) {
        const r = Number(ch.restValue)
        if (!Number.isFinite(r) || r < Number(ch.range[0]) || r > Number(ch.range[1])) {
          errors.push(`${at}.restValue must lie within range.`)
        }
      }
      if (ch.maxVelocityPerSec != null && !(Number(ch.maxVelocityPerSec) > 0)) {
        errors.push(`${at}.maxVelocityPerSec must be a positive number.`)
      }
    })
  }

  const channelIds = new Set(Array.isArray(raw.channels) ? raw.channels.map((c) => c?.id).filter(Boolean) : [])

  const checkVocab = (key, allowed) => {
    const list = raw[key]
    if (!Array.isArray(list)) { errors.push(`\`${key}\` must be an array.`); return }
    const seen = new Set()
    list.forEach((entry, i) => {
      const at = `${key}[${i}]`
      if (!isPlainObject(entry)) { errors.push(`${at} must be an object.`); return }
      if (typeof entry.id !== 'string' || !allowed.has(entry.id)) {
        errors.push(`${at}.id "${entry.id}" is not a canonical ${key === 'expressionVocabulary' ? 'expression' : 'gesture'} id.`)
      } else if (seen.has(entry.id)) {
        errors.push(`${at}.id "${entry.id}" is duplicated.`)
      } else {
        seen.add(entry.id)
      }
      if (entry.channelTargets != null) {
        if (!isPlainObject(entry.channelTargets)) {
          errors.push(`${at}.channelTargets must be an object.`)
        } else if (channelIds.size) {
          Object.keys(entry.channelTargets).forEach((cid) => {
            if (!channelIds.has(cid)) errors.push(`${at}.channelTargets references unknown channel "${cid}".`)
          })
        }
      }
      if (entry.minHoldMs != null && !(Number(entry.minHoldMs) >= 0)) errors.push(`${at}.minHoldMs must be >= 0.`)
      if (entry.durationMsHint != null && !(Number(entry.durationMsHint) > 0)) errors.push(`${at}.durationMsHint must be > 0.`)
    })
  }
  checkVocab('expressionVocabulary', EXPRESSION_IDS)
  checkVocab('gestureVocabulary', GESTURE_IDS)

  if (raw.constraints != null) {
    if (!isPlainObject(raw.constraints)) {
      errors.push('`constraints` must be an object.')
    } else {
      const c = raw.constraints
      const nonNeg = ['maxSimultaneousChannels', 'maxEventsPerMinute', 'minGapMsBetweenExpressionChanges', 'minGapMsBetweenGestures']
      nonNeg.forEach((k) => {
        if (c[k] != null && !(Number(c[k]) >= 0)) errors.push(`constraints.${k} must be a number >= 0.`)
      })
      if (c.speechSyncSupported != null && typeof c.speechSyncSupported !== 'boolean') {
        errors.push('constraints.speechSyncSupported must be a boolean.')
      }
    }
  }

  if (errors.length) return { ok: false, profile: null, errors }
  return { ok: true, profile: normalizeRigProfile(raw), errors: [] }
}

/**
 * Fill defaults and coerce types. Assumes the shape passed `validateRigProfile`
 * (or is close enough that coercion is harmless).
 */
export function normalizeRigProfile(raw) {
  if (!isPlainObject(raw)) return { ...DEFAULT_RIG_PROFILE }
  const c = isPlainObject(raw.constraints) ? raw.constraints : {}
  return {
    id: String(raw.id || '').trim() || `rig_${Date.now().toString(36)}`,
    schemaVersion: RIG_PROFILE_SCHEMA_VERSION,
    name: String(raw.name || 'Untitled rig').trim(),
    description: String(raw.description || ''),
    builtin: !!raw.builtin,
    channels: (Array.isArray(raw.channels) ? raw.channels : []).filter(isPlainObject).map((ch) => {
      const lo = num(ch.range?.[0], 0)
      const hi = num(ch.range?.[1], 100)
      return {
        id: String(ch.id || ''),
        group: CHANNEL_GROUPS.includes(ch.group) ? ch.group : 'other',
        label: String(ch.label || ch.id || ''),
        range: [lo, hi],
        units: CHANNEL_UNITS.includes(ch.units) ? ch.units : 'deg',
        restValue: Math.max(lo, Math.min(hi, num(ch.restValue, lo))),
        ...(ch.maxVelocityPerSec != null ? { maxVelocityPerSec: num(ch.maxVelocityPerSec, 0) } : {}),
      }
    }),
    expressionVocabulary: (Array.isArray(raw.expressionVocabulary) ? raw.expressionVocabulary : [])
      .filter((e) => isPlainObject(e) && EXPRESSION_IDS.has(e.id))
      .map((e) => ({
        id: e.id,
        supported: e.supported !== false,
        channelTargets: isPlainObject(e.channelTargets) ? { ...e.channelTargets } : {},
        intensityCapable: e.intensityCapable !== false,
        minHoldMs: Math.max(0, num(e.minHoldMs, 300)),
      })),
    gestureVocabulary: (Array.isArray(raw.gestureVocabulary) ? raw.gestureVocabulary : [])
      .filter((g) => isPlainObject(g) && GESTURE_IDS.has(g.id))
      .map((g) => ({
        id: g.id,
        supported: g.supported !== false,
        durationMsHint: Math.max(1, num(g.durationMsHint, 800)),
        loopable: !!g.loopable,
        category: String(g.category || 'other'),
      })),
    constraints: {
      maxSimultaneousChannels: Math.max(0, num(c.maxSimultaneousChannels, DEFAULT_CONSTRAINTS.maxSimultaneousChannels)),
      maxEventsPerMinute: Math.max(0, num(c.maxEventsPerMinute, DEFAULT_CONSTRAINTS.maxEventsPerMinute)),
      minGapMsBetweenExpressionChanges: Math.max(0, num(c.minGapMsBetweenExpressionChanges, DEFAULT_CONSTRAINTS.minGapMsBetweenExpressionChanges)),
      minGapMsBetweenGestures: Math.max(0, num(c.minGapMsBetweenGestures, DEFAULT_CONSTRAINTS.minGapMsBetweenGestures)),
      speechSyncSupported: c.speechSyncSupported !== false,
    },
  }
}

export const BUILTIN_RIG_PROFILES = [
  DEFAULT_RIG_PROFILE,
  ...[headOnly3dof, bust8dof, fullBody12dof].map((p) => Object.freeze({ ...normalizeRigProfile(p), builtin: true })),
]

export function findBuiltinRigProfile(id) {
  return BUILTIN_RIG_PROFILES.find((p) => p.id === id) || null
}

export function supportedExpressionIds(profile) {
  return (profile?.expressionVocabulary || []).filter((e) => e.supported).map((e) => e.id)
}

export function supportedGestureIds(profile) {
  return (profile?.gestureVocabulary || []).filter((g) => g.supported).map((g) => g.id)
}

export function rigSupports(profile, track, id) {
  if (!profile) return true
  if (track === 'expression') return supportedExpressionIds(profile).includes(id)
  if (track === 'gesture' || track === 'pose') return supportedGestureIds(profile).includes(id)
  if (track === 'speechSync') return profile.constraints?.speechSyncSupported !== false
  return false
}
