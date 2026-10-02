import { describe, it, expect } from 'vitest'
import {
  BUILTIN_RIG_PROFILES,
  DEFAULT_RIG_PROFILE,
  DEFAULT_RIG_PROFILE_ID,
  RIG_PROFILE_SCHEMA_VERSION,
  validateRigProfile,
  normalizeRigProfile,
  findBuiltinRigProfile,
  rigSupports,
  supportedExpressionIds,
  supportedGestureIds,
} from './index'
import { CANONICAL_EXPRESSIONS, CANONICAL_GESTURES } from '../motionVocabulary'
import headOnly from './presets/head-only-3dof.json'

function minimalRig(overrides = {}) {
  return {
    id: 'test_rig',
    name: 'Test rig',
    channels: [{ id: 'neck_tilt', group: 'head', range: [-30, 30], units: 'deg', restValue: 0 }],
    expressionVocabulary: [{ id: 'neutral', supported: true, channelTargets: { neck_tilt: 0 } }],
    gestureVocabulary: [{ id: 'nod', supported: true, durationMsHint: 700 }],
    constraints: { maxEventsPerMinute: 30 },
    ...overrides,
  }
}

describe('rig profiles', () => {
  it('every built-in preset validates', () => {
    for (const p of BUILTIN_RIG_PROFILES) {
      const res = validateRigProfile(p)
      expect(res.ok, `${p.id}: ${res.errors.join(' | ')}`).toBe(true)
      expect(p.schemaVersion).toBe(RIG_PROFILE_SCHEMA_VERSION)
      expect(p.builtin).toBe(true)
    }
    expect(BUILTIN_RIG_PROFILES.length).toBeGreaterThanOrEqual(4)
    expect(new Set(BUILTIN_RIG_PROFILES.map((p) => p.id)).size).toBe(BUILTIN_RIG_PROFILES.length)
  })

  it('default rig supports every canonical id', () => {
    expect(DEFAULT_RIG_PROFILE.id).toBe(DEFAULT_RIG_PROFILE_ID)
    expect(supportedExpressionIds(DEFAULT_RIG_PROFILE).sort()).toEqual(CANONICAL_EXPRESSIONS.map((e) => e.id).sort())
    expect(supportedGestureIds(DEFAULT_RIG_PROFILE).sort()).toEqual(CANONICAL_GESTURES.map((g) => g.id).sort())
  })

  it('head-only preset omits arm gestures and keeps the raw JSON intact', () => {
    const rig = findBuiltinRigProfile(headOnly.id)
    expect(rig).not.toBeNull()
    expect(rigSupports(rig, 'gesture', 'nod')).toBe(true)
    expect(rigSupports(rig, 'gesture', 'wave_greeting')).toBe(false)
    expect(rigSupports(rig, 'expression', 'smile_broad')).toBe(false)
    expect(rigSupports(rig, 'speechSync', 'emphasis')).toBe(true)
    expect(headOnly.channels.length).toBe(3)
  })

  it('rigSupports is permissive with a null rig', () => {
    expect(rigSupports(null, 'gesture', 'anything')).toBe(true)
  })

  it('accepts a minimal valid rig and fills defaults', () => {
    const res = validateRigProfile(minimalRig())
    expect(res.ok).toBe(true)
    expect(res.profile.constraints.maxEventsPerMinute).toBe(30)
    expect(res.profile.constraints.minGapMsBetweenGestures).toBeGreaterThan(0)
    expect(res.profile.expressionVocabulary[0].intensityCapable).toBe(true)
    expect(res.profile.gestureVocabulary[0].loopable).toBe(false)
  })

  it('rejects a non-object', () => {
    expect(validateRigProfile('nope').ok).toBe(false)
    expect(validateRigProfile(null).ok).toBe(false)
  })

  it('rejects missing channels array', () => {
    const res = validateRigProfile(minimalRig({ channels: undefined }))
    expect(res.ok).toBe(false)
    expect(res.errors.some((e) => e.includes('`channels`'))).toBe(true)
  })

  it('rejects out-of-range rest value and inverted range', () => {
    const r1 = validateRigProfile(minimalRig({ channels: [{ id: 'a', range: [0, 10], restValue: 50 }] }))
    expect(r1.ok).toBe(false)
    expect(r1.errors.some((e) => e.includes('restValue'))).toBe(true)
    const r2 = validateRigProfile(minimalRig({ channels: [{ id: 'a', range: [10, 0] }] }))
    expect(r2.ok).toBe(false)
    expect(r2.errors.some((e) => e.includes('min must be less than max'))).toBe(true)
  })

  it('rejects duplicate channel ids', () => {
    const res = validateRigProfile(minimalRig({
      channels: [{ id: 'a', range: [0, 1] }, { id: 'a', range: [0, 1] }],
      expressionVocabulary: [],
    }))
    expect(res.ok).toBe(false)
    expect(res.errors.some((e) => e.includes('duplicated'))).toBe(true)
  })

  it('rejects non-canonical vocabulary ids and duplicates', () => {
    const r1 = validateRigProfile(minimalRig({ expressionVocabulary: [{ id: 'raise_left_arm_45deg' }] }))
    expect(r1.ok).toBe(false)
    expect(r1.errors.some((e) => e.includes('not a canonical expression id'))).toBe(true)
    const r2 = validateRigProfile(minimalRig({ gestureVocabulary: [{ id: 'nod' }, { id: 'nod' }] }))
    expect(r2.ok).toBe(false)
    expect(r2.errors.some((e) => e.includes('duplicated'))).toBe(true)
  })

  it('rejects channelTargets that reference unknown channels', () => {
    const res = validateRigProfile(minimalRig({
      expressionVocabulary: [{ id: 'neutral', channelTargets: { ghost: 1 } }],
    }))
    expect(res.ok).toBe(false)
    expect(res.errors.some((e) => e.includes('unknown channel "ghost"'))).toBe(true)
  })

  it('rejects wrong schemaVersion and bad constraint types', () => {
    expect(validateRigProfile(minimalRig({ schemaVersion: 99 })).ok).toBe(false)
    const res = validateRigProfile(minimalRig({ constraints: { maxEventsPerMinute: -1, speechSyncSupported: 'yes' } }))
    expect(res.ok).toBe(false)
    expect(res.errors.length).toBe(2)
  })

  it('normalizeRigProfile drops unknown vocabulary and clamps rest values', () => {
    const p = normalizeRigProfile({
      id: 'x',
      name: 'x',
      channels: [{ id: 'a', range: [0, 10], restValue: 99 }],
      expressionVocabulary: [{ id: 'neutral' }, { id: 'bogus' }],
      gestureVocabulary: [{ id: 'bogus' }],
    })
    expect(p.channels[0].restValue).toBe(10)
    expect(p.expressionVocabulary.map((e) => e.id)).toEqual(['neutral'])
    expect(p.gestureVocabulary).toEqual([])
    expect(p.schemaVersion).toBe(RIG_PROFILE_SCHEMA_VERSION)
  })
})
